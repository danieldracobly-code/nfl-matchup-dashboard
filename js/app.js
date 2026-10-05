"use strict";
/* Data comes from js/data.js, which scripts/build_data.py regenerates. */
const D=window.NFL_DATA, SNAP=window.NFL_SNAPSHOT;
const META={
ARI:["Arizona","Cardinals","NFC West","#97233F","#000000"],ATL:["Atlanta","Falcons","NFC South","#A71930","#000000"],BAL:["Baltimore","Ravens","AFC North","#241773","#9E7C0C"],BUF:["Buffalo","Bills","AFC East","#00338D","#C60C30"],
CAR:["Carolina","Panthers","NFC South","#0085CA","#101820"],CHI:["Chicago","Bears","NFC North","#0B162A","#C83803"],CIN:["Cincinnati","Bengals","AFC North","#FB4F14","#000000"],CLE:["Cleveland","Browns","AFC North","#311D00","#FF3C00"],
DAL:["Dallas","Cowboys","NFC East","#003594","#869397"],DEN:["Denver","Broncos","AFC West","#FB4F14","#002244"],DET:["Detroit","Lions","NFC North","#0076B6","#B0B7BC"],GB:["Green Bay","Packers","NFC North","#203731","#FFB612"],
HOU:["Houston","Texans","AFC South","#03202F","#A71930"],IND:["Indianapolis","Colts","AFC South","#002C5F","#A2AAAD"],JAX:["Jacksonville","Jaguars","AFC South","#006778","#D7A22A"],KC:["Kansas City","Chiefs","AFC West","#E31837","#FFB81C"],
LA:["Los Angeles","Rams","NFC West","#003594","#FFD100"],LAC:["Los Angeles","Chargers","AFC West","#0080C6","#FFC20E"],LV:["Las Vegas","Raiders","AFC West","#000000","#A5ACAF"],MIA:["Miami","Dolphins","AFC East","#008E97","#FC4C02"],
MIN:["Minnesota","Vikings","NFC North","#4F2683","#FFC62F"],NE:["New England","Patriots","AFC East","#002244","#C60C30"],NO:["New Orleans","Saints","NFC South","#D3BC8D","#101820"],NYG:["New York","Giants","NFC East","#0B2265","#A71930"],
NYJ:["New York","Jets","AFC East","#125740","#000000"],PHI:["Philadelphia","Eagles","NFC East","#004C54","#A5ACAF"],PIT:["Pittsburgh","Steelers","AFC North","#FFB612","#101820"],SEA:["Seattle","Seahawks","NFC West","#002244","#69BE28"],
SF:["San Francisco","49ers","NFC West","#AA0000","#B3995D"],TB:["Tampa Bay","Buccaneers","NFC South","#D50A0A","#34302B"],TEN:["Tennessee","Titans","AFC South","#0C2340","#4B92DB"],WAS:["Washington","Commanders","NFC East","#5A1414","#FFB612"]};
const TEAMS=Object.keys(META).sort((x,y)=>(META[x][0]+META[x][1]).localeCompare(META[y][0]+META[y][1]));
const $=id=>document.getElementById(id);
const nick=t=>META[t][1], full=t=>META[t][0]+" "+META[t][1];

/* metric catalogue: key, label, offense wording, defense wording */
const LOW_O=new Set(["to_pg","sack_rate","to_drv"]);   // lower is better for an offense
const HIGH_D=new Set(["to_pg","sack_rate","to_drv"]);  // higher is better for a defense
const GROUPS=[
 ["Core",[["ppg","Points per game"],["ypg","Total yards per game"],["pass_ypg","Passing yards per game","net of sack yards"],["rush_ypg","Rushing yards per game"],["fd_pg","First downs per game"]]],
 ["Situational",[["third","Third-down conversion rate"],["rz_td","Red-zone touchdown rate"],["to_pg","Turnovers per game",["giveaways","takeaways"]],["sack_rate","Sack rate",["sacks taken per dropback","sacks made per dropback"]]]],
 ["Efficiency",[["epa","EPA per play"],["succ","Success rate"],["ypp","Yards per play"],["nya","Net yards per pass play"],["ypc","Yards per carry"],["expl","Explosive play rate"],["ppd","Points per drive"],["score_pct","Drives ending in a score"]]]
];
/* key, row label, unit, how the offense is described, how the defense is described */
const UNIT_ROWS=[["ppg","Scoring","points per game","points per game","points allowed per game"],["epa","Efficiency","EPA per play","EPA per play","EPA allowed per play"],["ypp","Moving the ball","yards per play","yards per play","yards allowed per play"],["nya","Passing","net yards per pass play","net yards per pass play","net yards allowed per pass play"],["ypc","Rushing","yards per carry","yards per carry","yards allowed per carry"],["third","Third down","conversion rate","third-down conversion rate","third-down rate allowed"],["rz_td","Red zone","touchdown rate","red-zone touchdown rate","red-zone touchdown rate allowed"],["to_pg","Turnovers","per game","avoiding turnovers","forcing turnovers"],["sack_rate","Pass protection vs. rush","sack rate","avoiding sacks","sack rate"]];
const PCT=new Set(["third","rz_td","succ","expl","score_pct","sack_rate","to_drv","cmp_pct"]);
function fmt(k,v){ if(k.startsWith("epa")){const r=Math.round(v*100)/100;return (r>0?"+":r<0?"\u2212":"")+Math.abs(r).toFixed(2);} if(PCT.has(k)) return v.toFixed(1)+"%"; if(k==="ppd") return v.toFixed(2); return v.toFixed(1); }
const ord=n=>{const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);};
const better=(side,k)=> side==="o" ? (LOW_O.has(k)?"lo":"hi") : (HIGH_D.has(k)?"hi":"lo");

/* league ranks for every metric on both sides */
const RANK={o:{},d:{}}, RANGE={o:{},d:{}};
for(const side of ["o","d"]) for(const k of Object.keys(D.BUF[side])){
  if(typeof D.BUF[side][k]!=="number") continue;
  const dir=better(side,k), arr=TEAMS.map(t=>[t,D[t][side][k]]).sort((x,y)=>dir==="hi"?y[1]-x[1]:x[1]-y[1]);
  const r={}; arr.forEach(([t,v],i)=>{ r[t]=(i>0&&v===arr[i-1][1])?r[arr[i-1][0]]:i+1; });
  RANK[side][k]=r; const vals=arr.map(x=>x[1]); RANGE[side][k]=[Math.min(...vals),Math.max(...vals)];
}

/* colours */
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const lum=h=>{const [r,g,b]=rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*r+.7152*g+.0722*b;};
const dist=(x,y)=>{const p=rgb(x),q=rgb(y);return Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);};
const textOn=h=>lum(h)>.36?"#16211B":"#FFFFFF";

let A,B,tapeSide="o";

function setTeams(a,b){
  A=a;B=b; $("selA").value=a; $("selB").value=b;
  let ca=META[a][3], cb=META[b][3]; if(dist(ca,cb)<110) cb=META[b][4]; if(dist(ca,cb)<110) cb="#6B7280";
  const s=document.documentElement.style; s.setProperty("--a",ca); s.setProperty("--b",cb); s.setProperty("--a-text",textOn(ca)); s.setProperty("--b-text",textOn(cb));
  render();
  document.querySelectorAll("#slate button").forEach(x=>x.setAttribute("aria-pressed", String((x.dataset.a===a&&x.dataset.b===b)||(x.dataset.a===b&&x.dataset.b===a))));
}

function record(t){const d=D[t];return d.w+"\u2013"+d.l+(d.t?"\u2013"+d.t:"");}
const sign=(v,dp=1)=>(v>0?"+":v<0?"\u2212":"")+Math.abs(v).toFixed(dp);
function fmtDate(e){const dt=new Date(e.d+"T12:00:00");const md=dt.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});let out=md;if(e.time){let [h,m]=e.time.split(":").map(Number);const ap=h>=12?"PM":"AM";h=h%12||12;out+=", "+h+":"+String(m).padStart(2,"0")+" "+ap;}return out;}

function renderBand(){
  const panel=(t,cls)=>{const d=D[t];return `<div class="side ${cls}"><div class="city">${META[t][0]}</div><div class="nick${nick(t).length>=8?" long":""}">${nick(t)}</div>
    <div class="rec">${record(t)}<small>${META[t][2]}</small></div>
    <dl><div><dt>Points per game</dt><dd>${(d.pf/d.g).toFixed(1)}</dd></div><div><dt>Allowed per game</dt><dd>${(d.pa/d.g).toFixed(1)}</dd></div><div><dt>Simple Rating</dt><dd>${sign(d.srs)}</dd></div><div><dt>Turnover margin</dt><dd>${sign(d.to_margin,0)}</dd></div></dl></div>`;};
  $("band").innerHTML=panel(A,"sa")+panel(B,"sb")+`<div class="mid" aria-hidden="true">vs</div>`;
  const g=D[A].sched.filter(e=>e.opp===B); let msg;
  if(!g.length) msg=`The ${nick(A)} and ${nick(B)} are not scheduled to meet in the ${SNAP.season} regular season.`;
  else msg=g.map(e=>{const site=e.n?`a neutral-site game (${e.n})`:(e.h?META[A][0]:META[B][0]);
    if(e.pf!==undefined){const w=e.pf>e.pa?A:B;return `<b>Already played in Week ${e.wk}:</b> ${nick(w)} won ${Math.max(e.pf,e.pa)}\u2013${Math.min(e.pf,e.pa)} in ${site}.`;}
    return `<b>They meet in Week ${e.wk}:</b> ${fmtDate(e)} ET in ${site}.`;}).join(" ");
  $("meet").innerHTML=msg;
  $("keyA").textContent=nick(A); $("keyB").textContent=nick(B);
}

/* offense of `o` against defense of `d`, for each unit row */
function unitRows(o,d){return UNIT_ROWS.map(([k,label,unit,po,pd])=>{const ro=RANK.o[k][o], rd=RANK.d[k][d];return {k,label,unit,po,pd,ro,rd,vo:D[o].o[k],vd:D[d].d[k],edge:rd-ro};});}
function edgeText(r,o,d){const m=Math.abs(r.edge); if(m<5) return ["Even","even"]; const who=r.edge>0?nick(o)+" offense":nick(d)+" defense"; return [(m>=13?"Big edge: ":"Edge: ")+who,""];}

function track(r,offIsA){
  const x=n=>((n-1)/31*100).toFixed(2);
  const ticks=Array.from({length:32},(_,i)=>`<i${[1,8,16,24,32].includes(i+1)?' class="maj"':''} style="left:${x(i+1)}%"></i>`).join("");
  const om=`<b class="m ${offIsA?"ma":"mb"}" style="left:${x(r.ro)}%" title="Offense: ${ord(r.ro)}"></b>`, dm=`<b class="m ${offIsA?"mb":"ma"}" style="left:${x(r.rd)}%" title="Defense: ${ord(r.rd)}"></b>`;
  return `<div class="strip track" role="img" aria-label="Offense ranks ${ord(r.ro)}, defense ranks ${ord(r.rd)}">${ticks}${dm}${om}</div>`;
}
function renderUnits(){
  const panel=(o,d,offIsA)=>{const rows=unitRows(o,d).map(r=>{const [txt,cls]=edgeText(r,o,d);
    return `<div class="urow"><div class="lab"><span>${r.label} <span class="rk">${r.unit}</span></span><span class="edge ${cls}">${txt}</span></div>
      <div class="ov"><div class="val">${fmt(r.k,r.vo)}</div><div class="rk">${ord(r.ro)}</div></div>${track(r,offIsA)}
      <div class="dv"><div class="val">${fmt(r.k,r.vd)}</div><div class="rk">${ord(r.rd)}</div></div></div>`;}).join("");
    return `<div class="unit"><h3>When the ${nick(o)} have the ball</h3>
      <div class="cap"><span><span class="mk ${offIsA?"ma":"mb"}"></span>${nick(o)} offense</span><span>${nick(d)} defense allows<span class="mk ${offIsA?"mb":"ma"}" style="margin:0 0 0 6px"></span></span></div>${rows}
      <div class="cap"><span>Ruler: 1st</span><span>32nd</span></div></div>`;};
  $("unitsBody").innerHTML=panel(A,B,true)+panel(B,A,false);
}
/* up to four units of team `t` that are top-half and rank well above the unit they face */
function edgeItems(t){
  const other=t===A?B:A, own=unitRows(t,other), opp=unitRows(other,t), items=[];
  own.forEach(r=>{if(r.edge>=5&&r.ro<=16) items.push([r.edge,`<b>${r.label}, with the ball.</b> The ${nick(t)} offense ranks ${ord(r.ro)} in ${r.po}; the ${nick(other)} defense ranks ${ord(r.rd)} in ${r.pd}.`]);});
  opp.forEach(r=>{if(r.edge<=-5&&r.rd<=16) items.push([-r.edge,`<b>${r.label}, on defense.</b> The ${nick(t)} defense ranks ${ord(r.rd)} in ${r.pd}; the ${nick(other)} offense ranks ${ord(r.ro)} in ${r.po}.`]);});
  return items.sort((x,y)=>y[0]-x[0]).slice(0,4).map(x=>x[1]);
}
const NO_EDGE="No top-half unit ranks at least five spots above the one it faces.";
function renderEdges(){
  const col=(t,cls)=>{const li=edgeItems(t).map(x=>`<li>${x}</li>`).join("");return `<div class="edgecol ${cls}"><h3>${full(t)}</h3>${li?`<ol>${li}</ol>`:`<p class="none">${NO_EDGE}</p>`}</div>`;};
  $("edgesBody").innerHTML=col(A,"")+col(B,"eb");
}

function strip(side,k){
  const [lo,hi]=RANGE[side][k], dir=better(side,k), span=(hi-lo)||1;
  const x=v=>{let f=(v-lo)/span; if(dir==="lo") f=1-f; return (f*100).toFixed(2);};
  const tip=t=>`${full(t)}: ${fmt(k,D[t][side][k])}`;
  const ticks=TEAMS.filter(t=>t!==A&&t!==B).map(t=>`<i style="left:${x(D[t][side][k])}%" title="${tip(t)}"></i>`).join("");
  return `<div class="strip" role="img" aria-label="${tip(A)}. ${tip(B)}.">${ticks}<b class="m mb" style="left:${x(D[B][side][k])}%" title="${tip(B)}"></b><b class="m ma" style="left:${x(D[A][side][k])}%" title="${tip(A)}"></b></div>`;
}
function renderTape(){
  const side=tapeSide; let h="";
  for(const [g,rows] of GROUPS){ h+=`<h3>${g}</h3>`;
    for(const [k,label,note] of rows){
      const ra=RANK[side][k][A], rb=RANK[side][k][B];
      let sm=Array.isArray(note)?note[side==="o"?0:1]:(note||""); if(side==="d"&&!Array.isArray(note)) sm=sm?sm+", allowed":"allowed";
      const extra=k==="third"?"third_n":k==="rz_td"?"rz_n":null;
      const cell=(t,r,cls,win)=>`<div class="${cls}${win?" win":""}"><div class="val">${fmt(k,D[t][side][k])}</div><div class="rk">${ord(r)}${extra?" ("+D[t][side][extra]+")":""}</div></div>`;
      h+=`<div class="trow"><div class="name">${label}${sm?`<small>${sm}</small>`:""}</div>${cell(A,ra,"va",ra<rb)}${strip(side,k)}${cell(B,rb,"vb",rb<ra)}</div>`;
    }}
  h+=`<div class="axis"><div><span>Worst in league</span><span>Best in league</span></div></div>`;
  $("tapeBody").innerHTML=h;
  $("tOff").setAttribute("aria-pressed",String(side==="o")); $("tDef").setAttribute("aria-pressed",String(side==="d"));
}

function renderLogs(){
  const log=(t,other)=>{const rows=D[t].sched.map(e=>{const opp=(e.n?"vs. ":e.h?"vs. ":"at ")+nick(e.opp)+(e.n?" (neutral)":""); const cls=e.opp===other?"h2h":"";
    if(e.pf!==undefined){const r=e.pf>e.pa?"W":e.pf<e.pa?"L":"T";
      return `<tr class="${cls}"><td>${e.wk}</td><td>${opp}</td><td class="res">${r} ${e.pf}\u2013${e.pa}</td><td class="num">${e.y}\u2013${e.ya}</td><td class="num">${e.to}\u2013${e.tk}</td><td class="num">${fmt("epa",e.epa)}</td></tr>`;}
    return `<tr class="next ${cls}"><td>${e.wk}</td><td>${opp}</td><td colspan="4">${fmtDate(e)}</td></tr>`;}).join("");
    return `<div class="log"><h3>${full(t)}, ${record(t)}</h3><div class="scroll"><table><thead><tr><th>Wk</th><th>Opponent</th><th>Result</th><th class="num">Yards</th><th class="num">Turnovers</th><th class="num">EPA/play</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;};
  $("logsBody").innerHTML=log(A,B)+log(B,A);
  const pa=D[A].sched.filter(e=>e.pf!==undefined), pb=D[B].sched.filter(e=>e.pf!==undefined);
  const res=(t,e)=>`${nick(t)} ${e.pf>e.pa?"won":e.pf<e.pa?"lost":"tied"} ${e.pf}\u2013${e.pa}`;
  const common=pa.filter(e=>pb.some(f=>f.opp===e.opp)).map(e=>{const f=pb.find(f=>f.opp===e.opp);return `<tr><td>${full(e.opp)}</td><td>${res(A,e)} (Wk ${e.wk})</td><td>${res(B,f)} (Wk ${f.wk})</td></tr>`;}).join("");
  $("commonBody").innerHTML=`<h3>Common opponents so far</h3>`+(common?`<div class="scroll"><table><tbody>${common}</tbody></table></div>`:`<p style="margin:0;color:var(--muted)">None yet. These teams have not played any of the same opponents.</p>`);
}

/* ---------- printable report ---------- */
const PAGE_TITLE=document.title;
const REPORT_STATS=[["ppg","Points per game"],["ypg","Total yards per game"],["pass_ypg","Passing yards per game"],["rush_ypg","Rushing yards per game"],["ypp","Yards per play"],["epa","EPA per play"],["third","Third-down rate"],["rz_td","Red-zone touchdown rate"],["to_pg","Turnovers per game"],["sack_rate","Sack rate"],["ppd","Points per drive"]];
function meetingText(){
  const g=D[A].sched.filter(e=>e.opp===B);
  if(!g.length) return `The ${nick(A)} and ${nick(B)} are not scheduled to meet in the ${SNAP.season} regular season.`;
  return g.map(e=>{const site=e.n?`a neutral-site game (${e.n})`:(e.h?META[A][0]:META[B][0]);
    if(e.pf!==undefined){const w=e.pf>e.pa?A:B;return `Already played in Week ${e.wk}: ${nick(w)} won ${Math.max(e.pf,e.pa)}\u2013${Math.min(e.pf,e.pa)} in ${site}.`;}
    return `They meet in Week ${e.wk}: ${fmtDate(e)} ET in ${site}.`;}).join(" ");
}
function buildReport(){
  const cell=(side,k,t)=>`<td class="n">${fmt(k,D[t][side][k])} <span>${ord(RANK[side][k][t])}</span></td>`;
  const glance=[["Record",record],["Division",t=>META[t][2]],["Points per game",t=>(D[t].pf/D[t].g).toFixed(1)],["Points allowed per game",t=>(D[t].pa/D[t].g).toFixed(1)],["Point margin per game",t=>sign((D[t].pf-D[t].pa)/D[t].g)],["Simple Rating",t=>sign(D[t].srs)],["Turnover margin",t=>sign(D[t].to_margin,0)],["Penalties per game",t=>D[t].pen_pg.toFixed(1)]]
    .map(([l,f])=>`<tr><th>${l}</th><td class="n">${f(A)}</td><td class="n">${f(B)}</td></tr>`).join("");
  const edges=t=>{const li=edgeItems(t).map(x=>`<li>${x}</li>`).join("");return `<div><h3 class="${t===A?"ta":"tb"}">${nick(t)}</h3>${li?`<ol>${li}</ol>`:`<p>${NO_EDGE}</p>`}</div>`;};
  const unit=(o,d)=>`<div><h3 class="${o===A?"ta":"tb"}">When the ${nick(o)} have the ball</h3><table><thead><tr><th></th><th class="n">${o} offense</th><th class="n">${d} defense</th><th>Edge</th></tr></thead><tbody>${
    unitRows(o,d).map(r=>{const m=Math.abs(r.edge),e=m<5?"Even":(r.edge>0?nick(o):nick(d))+(m>=13?" (big)":"");
      return `<tr><th>${r.label} <span>${r.unit}</span></th><td class="n">${fmt(r.k,r.vo)} <span>${ord(r.ro)}</span></td><td class="n">${fmt(r.k,r.vd)} <span>${ord(r.rd)}</span></td><td>${e}</td></tr>`;}).join("")}</tbody></table></div>`;
  const stats=REPORT_STATS.map(([k,l])=>`<tr><th>${l}</th>${cell("o",k,A)}${cell("o",k,B)}${cell("d",k,A)}${cell("d",k,B)}</tr>`).join("");
  const games=t=>{const played=D[t].sched.filter(e=>e.pf!==undefined), next=D[t].sched.filter(e=>e.pf===undefined).slice(0,3);
    const where=e=>(e.n||e.h?"vs. ":"at ")+nick(e.opp);
    return `<div><h3 class="${t===A?"ta":"tb"}">${full(t)}, ${record(t)}</h3><table><tbody>${
      played.map(e=>`<tr><td>Wk ${e.wk}</td><td>${where(e)}</td><td>${e.pf>e.pa?"W":e.pf<e.pa?"L":"T"} ${e.pf}\u2013${e.pa}</td><td class="n">${e.y}\u2013${e.ya} yds</td></tr>`).join("")}${
      next.map(e=>`<tr class="up"><td>Wk ${e.wk}</td><td>${where(e)}</td><td colspan="2">${fmtDate(e)} ET</td></tr>`).join("")}</tbody></table></div>`;};
  const today=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  $("report").innerHTML=`
    <header><h1><span class="ta">${full(A)}</span> vs. <span class="tb">${full(B)}</span></h1>
      <p>Matchup report. ${meetingText()}</p><p class="fine">${SNAP.asof}</p></header>
    <section><h2>At a glance</h2><table class="glance"><thead><tr><th></th><th class="n">${nick(A)}</th><th class="n">${nick(B)}</th></tr></thead><tbody>${glance}</tbody></table></section>
    <section><h2>Biggest edges</h2><div class="two">${edges(A)}${edges(B)}</div></section>
    <section><h2>Offense vs. defense</h2><div class="two">${unit(A,B)}${unit(B,A)}</div></section>
    <section><h2>Key numbers, with league rank</h2><table><thead><tr><th></th><th class="n">${A} offense</th><th class="n">${B} offense</th><th class="n">${A} defense</th><th class="n">${B} defense</th></tr></thead><tbody>${stats}</tbody></table></section>
    <section><h2>Results and next games</h2><div class="two">${games(A)}${games(B)}</div></section>
    <footer>Ranks are out of 32 teams; defensive numbers are what the defense allows (turnovers and sacks are those it forces). ${SNAP.src} Printed ${today}.</footer>`;
}
function printReport(){
  buildReport();
  document.title=`${nick(A)} vs ${nick(B)} matchup report, Week ${SNAP.week} ${SNAP.season}`;  // becomes the default PDF file name
  window.print();
}

function render(){renderBand();renderEdges();renderUnits();renderTape();renderLogs();}

/* controls */
function init(){
  const divs={}; TEAMS.forEach(t=>(divs[META[t][2]]=divs[META[t][2]]||[]).push(t));
  const opts=Object.keys(divs).sort().map(dv=>`<optgroup label="${dv}">${divs[dv].map(t=>`<option value="${t}">${full(t)}</option>`).join("")}</optgroup>`).join("");
  $("selA").innerHTML=opts; $("selB").innerHTML=opts;
  $("selA").onchange=e=>{let b=B; if(e.target.value===b) b=A; setTeams(e.target.value,b);};
  $("selB").onchange=e=>{let a=A; if(e.target.value===a) a=B; setTeams(a,e.target.value);};
  $("swap").onclick=()=>setTeams(B,A);
  $("tOff").onclick=()=>{tapeSide="o";renderTape();}; $("tDef").onclick=()=>{tapeSide="d";renderTape();};
  /* upcoming slate: every unplayed game through the next full week */
  const up=[]; TEAMS.forEach(t=>D[t].sched.forEach(e=>{if(e.h&&e.pf===undefined) up.push({a:e.opp,b:t,wk:e.wk,d:e.d,time:e.time});}));
  up.sort((x,y)=>(x.d+x.time).localeCompare(y.d+y.time));
  const wk=up.length?up[0].wk:0, slate=up.filter(g=>g.wk<=wk+(up.filter(g=>g.wk===wk).length<8?1:0));
  $("slate").innerHTML=`<span class="lbl">Upcoming games</span>`+slate.map(g=>`<button type="button" data-a="${g.a}" data-b="${g.b}" aria-pressed="false" title="Week ${g.wk}: ${fmtDate(g)} ET">${g.a} at ${g.b}</button>`).join("");
  $("slate").onclick=e=>{const b=e.target.closest("button"); if(b) setTeams(b.dataset.a,b.dataset.b);};
  $("asof").textContent=SNAP.asof;
  $("srcNote").textContent=SNAP.src;
  $("printBtn").onclick=printReport;
  window.addEventListener("beforeprint",buildReport);
  window.addEventListener("afterprint",()=>{document.title=PAGE_TITLE;});
  const first=slate.find(g=>g.wk===wk+1)||slate[0]||{a:"BUF",b:"KC"};
  setTeams(first.a,first.b);
}
init();
