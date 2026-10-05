#!/usr/bin/env python3
"""Rebuild js/data.js for the NFL matchup dashboard.

Downloads the open nflverse play-by-play file and schedule for one season,
calculates team offense / defense / situational / efficiency numbers, and
writes them to js/data.js as two globals the page reads:

    window.NFL_DATA      per-team stats, game log and schedule
    window.NFL_SNAPSHOT  text describing how current the data is

Usage:
    python scripts/build_data.py            # current season
    python scripts/build_data.py 2026       # a specific season
"""
import datetime as dt
import json
import pathlib
import sys
import urllib.request

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache"
OUT = ROOT / "js" / "data.js"
PBP_URL = "https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_{season}.csv.gz"
GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv"


def current_season(today=None):
    today = today or dt.date.today()
    return today.year if today.month >= 8 else today.year - 1


def download(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {url}")
    urllib.request.urlretrieve(url, dest)
    return dest


def unit_totals(pbp, col):
    """Season totals grouped by `col`: 'posteam' for offense, 'defteam' for defense."""
    d = pbp[(pbp.two_point_attempt != 1) & pbp[col].notna()].copy()
    d["att"] = d.complete_pass.fillna(0) + d.incomplete_pass.fillna(0) + d.interception.fillna(0)
    d.loc[(d.play_type == "qb_spike") & (d.att == 0), "att"] = 1
    d["sk"] = d.sack.fillna(0)
    d["skyds"] = np.where(d.sk == 1, -d.yards_gained.fillna(0), 0)
    d["ra"] = d.rush_attempt.fillna(0)
    d["scrim"] = ((d.att == 1) | (d.sk == 1) | (d.ra == 1)).astype(int)
    d["fd"] = d.first_down_rush.fillna(0) + d.first_down_pass.fillna(0) + d.first_down_penalty.fillna(0)
    d["to"] = d.interception.fillna(0) + d.fumble_lost.fillna(0)
    d["expl"] = (((d.att == 1) & (d.yards_gained >= 20)) | ((d.ra == 1) & (d.yards_gained >= 10))).astype(int)
    out = d.groupby(col).agg(
        att=("att", "sum"), cmp=("complete_pass", "sum"), pyds=("passing_yards", "sum"),
        ptd=("pass_touchdown", "sum"), ints=("interception", "sum"), sk=("sk", "sum"), skyds=("skyds", "sum"),
        ra=("ra", "sum"), ryds=("rushing_yards", "sum"), rtd=("rush_touchdown", "sum"), fl=("fumble_lost", "sum"),
        fd=("fd", "sum"), to=("to", "sum"), c3=("third_down_converted", "sum"), f3=("third_down_failed", "sum"),
        c4=("fourth_down_converted", "sum"), f4=("fourth_down_failed", "sum"), expl=("expl", "sum"), plays=("scrim", "sum"))

    # EPA and success rate on dropbacks and designed runs
    e = d[((d["pass"] == 1) | (d.rush == 1)) & d.epa.notna()]
    out["epa"] = e.groupby(col).epa.mean()
    out["succ"] = e.groupby(col).success.mean()
    out["epa_pass"] = e[e["pass"] == 1].groupby(col).epa.mean()
    out["epa_rush"] = e[e.rush == 1].groupby(col).epa.mean()

    # Drive-level numbers
    dr = pbp[pbp.posteam.notna() & pbp.fixed_drive.notna()].copy()
    dr["rz"] = ((dr.yardline_100 <= 20) & dr.play_type.isin(["pass", "run", "qb_kneel", "qb_spike", "field_goal"])).astype(int)
    dr["ydsg"] = np.where(dr.play_type.isin(["pass", "run", "qb_kneel"]), dr.yards_gained.fillna(0), 0)
    dd = dr.groupby(["game_id", "posteam", "defteam", "fixed_drive"]).agg(
        res=("fixed_drive_result", "first"), rz=("rz", "max"),
        s0=("posteam_score", "min"), s1=("posteam_score_post", "max"), yds=("ydsg", "sum")).reset_index()
    dd["pts"] = (dd.s1 - dd.s0).clip(lower=0)
    dd["td"] = (dd.res == "Touchdown").astype(int)
    dd["score"] = dd.res.isin(["Touchdown", "Field goal"]).astype(int)
    dd["tov"] = dd.res.isin(["Turnover", "Opp touchdown"]).astype(int)
    k = dd.groupby(col)
    out["drives"], out["dpts"], out["dscore"] = k.size(), k.pts.sum(), k.score.sum()
    out["dtov"], out["dyds"], out["rz"] = k.tov.sum(), k.yds.sum(), k.rz.sum()
    out["rztd"] = dd[dd.rz == 1].groupby(col).td.sum()
    return out.fillna(0)


def rates(r, games):
    """Turn one team's season totals into the per-game / per-play numbers the page shows."""
    net = r.pyds - r.skyds
    total = net + r.ryds
    dropbacks = r.att + r.sk
    return dict(
        ypg=total / games, pass_ypg=net / games, rush_ypg=r.ryds / games, ypp=total / r.plays,
        cmp_pct=100 * r.cmp / r.att, nya=net / dropbacks, ypc=r.ryds / r.ra, to_pg=r.to / games,
        ints=int(r.ints), fl=int(r.fl), sk=int(r.sk), sack_rate=100 * r.sk / dropbacks, fd_pg=r.fd / games,
        third=100 * r.c3 / max(r.c3 + r.f3, 1), third_n=f"{int(r.c3)}/{int(r.c3 + r.f3)}",
        fourth_n=f"{int(r.c4)}/{int(r.c4 + r.f4)}",
        rz_td=100 * r.rztd / max(r.rz, 1), rz_n=f"{int(r.rztd)}/{int(r.rz)}",
        epa=r.epa, epa_pass=r.epa_pass, epa_rush=r.epa_rush, succ=100 * r.succ, expl=100 * r.expl / r.plays,
        ppd=r.dpts / r.drives, score_pct=100 * r.dscore / r.drives, to_drv=100 * r.dtov / r.drives,
        ypd=r.dyds / r.drives, pass_rate=100 * dropbacks / r.plays, ptd=int(r.ptd), rtd=int(r.rtd),
        tot=int(total), net=int(net), ryds=int(r.ryds), att=int(r.att), cmp=int(r.cmp), ra=int(r.ra), plays=int(r.plays))


def game_lines(pbp, col):
    d = pbp[(pbp.two_point_attempt != 1) & pbp[col].notna()].copy()
    d["y"] = np.where(d.play_type.isin(["pass", "run", "qb_kneel"]), d.yards_gained.fillna(0), 0)
    d["to"] = d.interception.fillna(0) + d.fumble_lost.fillna(0)
    a = d.groupby(["game_id", col]).agg(y=("y", "sum"), to=("to", "sum"))
    a["epa"] = d[((d["pass"] == 1) | (d.rush == 1)) & d.epa.notna()].groupby(["game_id", col]).epa.mean()
    return a


def simple_rating(played, teams):
    """Simple Rating System: average point margin adjusted for opponents (league average = 0)."""
    margin = {t: [] for t in teams}
    opps = {t: [] for t in teams}
    for _, g in played.iterrows():
        m = g.home_score - g.away_score
        margin[g.home_team].append(m); opps[g.home_team].append(g.away_team)
        margin[g.away_team].append(-m); opps[g.away_team].append(g.home_team)
    mov = {t: float(np.mean(margin[t])) if margin[t] else 0.0 for t in teams}
    srs = dict(mov)
    for _ in range(2000):
        new = {t: mov[t] + (float(np.mean([srs[o] for o in opps[t]])) if opps[t] else 0.0) for t in teams}
        mean = float(np.mean(list(new.values())))
        new = {t: v - mean for t, v in new.items()}
        delta = max(abs(new[t] - srs[t]) for t in teams)
        srs = new
        if delta < 1e-9:
            break
    return srs


def round_stats(stats):
    out = {}
    for k, v in stats.items():
        if isinstance(v, (float, np.floating)):
            out[k] = round(float(v), 3 if k.startswith("epa") else 2)
        else:
            out[k] = v
    return out


def build(season):
    pbp = pd.read_csv(download(PBP_URL.format(season=season), CACHE / f"pbp_{season}.csv.gz"), low_memory=False)
    pbp = pbp[pbp.season_type == "REG"].copy()
    games = pd.read_csv(download(GAMES_URL, CACHE / "games.csv"))
    games = games[(games.season == season) & (games.game_type == "REG")].copy()
    played = games[games.home_score.notna() & games.game_id.isin(set(pbp.game_id))]
    if played.empty:
        sys.exit(f"No completed {season} regular-season games found yet. Nothing written.")

    teams = sorted(set(games.home_team))
    offense, defense = unit_totals(pbp, "posteam"), unit_totals(pbp, "defteam")
    flags = pbp[pbp.penalty == 1].groupby("penalty_team").agg(pen=("penalty", "sum"), yds=("penalty_yards", "sum"))
    lines = game_lines(pbp, "posteam")
    srs = simple_rating(played, teams)
    done = set(played.game_id)

    data = {}
    for t in teams:
        sched, pf, pa, w, l, ties = [], 0, 0, 0, 0, 0
        for _, g in games[(games.home_team == t) | (games.away_team == t)].sort_values("week").iterrows():
            home = g.home_team == t
            opp = g.away_team if home else g.home_team
            e = dict(wk=int(g.week), d=g.gameday, opp=opp, h=int(home))
            if g.location == "Neutral":
                e["n"] = str(g.stadium)
            if g.game_id in done:
                a, b = (g.home_score, g.away_score) if home else (g.away_score, g.home_score)
                pf += a; pa += b; w += a > b; l += a < b; ties += a == b
                e.update(pf=int(a), pa=int(b),
                         y=int(lines.loc[(g.game_id, t), "y"]), ya=int(lines.loc[(g.game_id, opp), "y"]),
                         to=int(lines.loc[(g.game_id, t), "to"]), tk=int(lines.loc[(g.game_id, opp), "to"]),
                         epa=round(float(lines.loc[(g.game_id, t), "epa"]), 3),
                         epa_a=round(float(lines.loc[(g.game_id, opp), "epa"]), 3))
            else:
                e.update(day=str(g.weekday)[:3], time=str(g.gametime))
            sched.append(e)
        n = w + l + ties
        if n == 0:
            sys.exit(f"{t} has not played yet. Run again once every team has a game.")
        o, d = rates(offense.loc[t], n), rates(defense.loc[t], n)
        o["ppg"], d["ppg"] = pf / n, pa / n
        pen = flags.loc[t] if t in flags.index else pd.Series(dict(pen=0, yds=0))
        data[t] = dict(g=int(n), w=int(w), l=int(l), t=int(ties), pf=int(pf), pa=int(pa), srs=round(srs[t], 1),
                       pen_pg=round(float(pen.pen) / n, 2), penyds_pg=round(float(pen.yds) / n, 1),
                       to_margin=int(defense.loc[t].to - offense.loc[t].to),
                       o=round_stats(o), d=round_stats(d), sched=sched)

    last = played.sort_values(["gameday", "gametime"]).iloc[-1]
    last_day = dt.date.fromisoformat(last.gameday)
    pending = int(((games.week == last.week) & ~games.game_id.isin(done)).sum())
    asof = (f"{season} regular season, {len(played)} games played, through "
            f"{last_day.strftime('%A, %B')} {last_day.day} (Week {int(last.week)}).")
    if pending:
        asof += f" {pending} Week {int(last.week)} game{'s' if pending > 1 else ''} not yet included."
    if max(v["g"] for v in data.values()) <= 5:
        asof += " This is a small sample, so expect the rankings to move."
    snapshot = dict(
        season=season, week=int(last.week), games=len(played), built=dt.date.today().isoformat(), asof=asof,
        src=("Team statistics are calculated from the open nflverse play-by-play data. Yardage follows the standard "
             "box-score definition (passing yards are net of sacks). Drive and red-zone figures use nflverse drive "
             "definitions and can differ from other sites by a drive or two. Rankings are out of 32 and are based on "
             "per-game or per-play rates."))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("/* Generated by scripts/build_data.py. Do not edit by hand. */\n"
                   f"window.NFL_SNAPSHOT={json.dumps(snapshot)};\n"
                   f"window.NFL_DATA={json.dumps(data, separators=(',', ':'))};\n")
    print(f"Wrote {OUT.relative_to(ROOT)}: {asof}")
    return data


if __name__ == "__main__":
    build(int(sys.argv[1]) if len(sys.argv) > 1 else current_season())
