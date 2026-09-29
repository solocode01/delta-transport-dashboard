const $ = (id) => document.getElementById(id);

const N = (s) =>
  (s || "").toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();

const SC = {
  11: ["very unsafe", "unsafe", "moderately safe", "safe", "very safe"],

  13: ["very poor", "poor", "fair", "good", "excellent"],

  14: ["very poor", "poor", "fair", "good", "excellent"],

  15: [
    "very unreliable",
    "unreliable",
    "fairly reliable",
    "reliable",
    "very reliable",
  ],

  16: [
    "very dissatisfied",
    "dissatisfied",
    "neutral",
    "satisfied",
    "very satisfied",
  ],

  20: [
    "strongly do not support",
    "do not support",
    "neutral",
    "support",
    "strongly support",
  ],
};

const ORD = {
  5: [
    "less than 15 minutes",
    "15-30 minutes",
    "31-45 minutes",
    "46-60 minutes",
    "1-2 hours",
    "more than 2 hours",
  ],

  6: [
    "less than 5 minutes",
    "5-10 minutes",
    "11-20 minutes",
    "21-30 minutes",
    "31-60 minutes",
    "more than 1 hour",
  ],

  7: [
    "less than ₦500",
    "₦500-₦1,000",
    "₦1,001-₦2,000",
    "₦2,001-₦3,000",
    "₦3,001-₦5,000",
    "more than ₦5,000",
  ],

  9: [
    "never",
    "rarely",
    "occasionally",
    "frequently",
    "very frequently",
    "almost every day",
  ],
};

let rows = [];

/* =========================
   CSV PARSING
========================= */

function parseCSV(t) {
  const r = [];
  let row = [];
  let c = "";
  let q = false;

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];

    if (q) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          c += '"';
          i++;
        } else {
          q = false;
        }
      } else {
        c += ch;
      }
    } else if (ch === '"') {
      q = true;
    } else if (ch === ",") {
      row.push(c);
      c = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") {
        i++;
      }

      row.push(c);
      c = "";

      if (row.some((x) => x.trim())) {
        r.push(row);
      }

      row = [];
    } else {
      c += ch;
    }
  }

  if (c || row.length) {
    row.push(c);

    if (row.some((x) => x.trim())) {
      r.push(row);
    }
  }

  return r;
}

function load(text, label) {
  try {
    const t = parseCSV(text.replace(/^\uFEFF/, ""));

    if (t.length < 2) {
      throw 0;
    }

    const off = /timestamp/i.test(t[0][0]) ? 1 : 0;

    if (t[0].length - off < 20) {
      throw 0;
    }

    rows = t.slice(1).map((r) => {
      const o = {};

      for (let q = 1; q <= 20; q++) {
        o[q] = (r[off + q - 1] || "").trim();
      }

      return o;
    });

    const l = [...new Set(rows.map((r) => r[1]).filter(Boolean))].sort();

    $("lga").innerHTML =
      '<option value="">All areas</option>' +
      l.map((x) => `<option>${x}</option>`).join("");

    $("msg").className = "";
    $("msg").textContent = `Loaded ${rows.length} responses from ${label}.`;

    $("dash").style.display = "block";

    render();
  } catch (e) {
    $("msg").className = "err";
    $("msg").textContent =
      "Could not read that file. Use the CSV downloaded from the linked Google Sheet, with all 20 question columns.";
  }
}

/* =========================
   DATA HELPERS
========================= */

const cnt = (d, q) => {
  const m = {};

  d.forEach((r) => {
    const v = r[q];

    if (v) {
      m[v] = (m[v] || 0) + 1;
    }
  });

  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};

const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);

function sc(d, q) {
  const v = d.map((r) => SC[q].indexOf(N(r[q])) + 1).filter((x) => x > 0);

  return {
    n: v.length,
    avg: v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0,
    neg: pct(v.filter((x) => x <= 2).length, v.length),
    pos: pct(v.filter((x) => x >= 4).length, v.length),
  };
}

function ordShare(d, q, minIdx) {
  const v = d.map((r) => ORD[q].indexOf(N(r[q]))).filter((x) => x >= 0);

  return pct(v.filter((x) => x >= minIdx).length, v.length);
}

/* =========================
   CHART / BAR GENERATORS
========================= */

function bars(title, d, q, max = 7) {
  const c = cnt(d, q);
  const tot = c.reduce((a, b) => a + b[1], 0) || 1;
  const top = c.slice(0, max);

  return `
    <div class="card">
      <h3>${title}</h3>

      ${
        top
          .map(
            (x, i) => `
              <div class="bar ${i ? "" : "top"}">
                <span>${x[0]}</span>
                <i style="width: ${
                  (100 * x[1]) / tot / (top[0][1] / tot)
                }%"></i>
                <span>${pct(x[1], tot)}%</span>
              </div>
            `,
          )
          .join("") || '<span class="note">No answers</span>'
      }
    </div>
  `;
}

function ordBars(title, d, q) {
  const c = cnt(d, q);

  const m = Object.fromEntries(c.map((x) => [N(x[0]), x[1]]));

  const tot = c.reduce((a, b) => a + b[1], 0) || 1;

  const mx = Math.max(...ORD[q].map((o) => m[o] || 0), 1);

  return `
    <div class="card">
      <h3>${title}</h3>

      ${ORD[q]
        .map(
          (o) => `
            <div class="bar">
              <span>${o}</span>
              <i style="width: ${(100 * (m[o] || 0)) / mx}%"></i>
              <span>${pct(m[o] || 0, tot)}%</span>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

const top1 = (d, q) => {
  const c = cnt(d, q);

  return c.length
    ? {
        name: c[0][0],
        share: pct(
          c[0][1],
          c.reduce((a, b) => a + b[1], 0),
        ),
      }
    : {
        name: "n/a",
        share: 0,
      };
};

/* =========================
   MAIN DASHBOARD RENDER
========================= */

function render() {
  const f = $("lga").value;
  const d = f ? rows.filter((r) => r[1] == f) : rows;
  const n = d.length;

  $("count").textContent = `${n} response${n == 1 ? "" : "s"} in view`;

  const sat = sc(d, 16);
  const saf = sc(d, 11);
  const av = sc(d, 13);
  const rd = sc(d, 14);
  const rel = sc(d, 15);
  const dig = sc(d, 20);

  const worse = pct(
    d.filter((r) => /worse/i.test(r[19])).length,
    d.filter((r) => r[19]).length,
  );

  const better = pct(
    d.filter((r) => /better/i.test(r[19])).length,
    d.filter((r) => r[19]).length,
  );

  const delay = pct(
    d.filter((r) => ORD[9].indexOf(N(r[9])) >= 3).length,
    d.filter((r) => r[9]).length,
  );

  /* =========================
     KPIs
  ========================= */

  $("kpis").innerHTML = [
    [sat.pos + "%", "satisfied with services"],
    [sat.neg + "%", "dissatisfied"],
    [saf.neg + "%", "feel unsafe"],
    [delay + "%", "face frequent delays"],
    [worse + "%", "say it is worse than 6 months ago"],
    [dig.pos + "%", "support digital monitoring"],
  ]
    .map(
      (k) => `
        <div class="kpi">
          <b>${k[0]}</b>
          <small>${k[1]}</small>
        </div>
      `,
    )
    .join("");

  /* =========================
     SERVICE SCORES
  ========================= */

  const col = (a) =>
    a >= 3.5 ? "var(--ok)" : a >= 2.75 ? "var(--lane)" : "var(--bad)";

  $("scores").innerHTML =
    [
      ["Satisfaction", sat],
      ["Availability", av],
      ["Road condition", rd],
      ["Reliability", rel],
      ["Safety", saf],
    ]
      .map(
        ([l, s]) => `
          <div class="score">
            <span>${l}</span>

            <div class="track">
              <i
                style="
                  width: ${(s.avg / 5) * 100}%;
                  background: ${col(s.avg)};
                "
              ></i>
            </div>

            <b>${s.avg.toFixed(1)}</b>
          </div>
        `,
      )
      .join("") +
    `
      <p class="note">
        Average out of 5. Red is below 2.75, yellow is 2.75 to 3.5,
        green is above 3.5.
      </p>
    `;

  /* =========================
     PROBLEMS AND CAUSES
  ========================= */

  $("g1").innerHTML =
    bars("Biggest transport problem", d, 8) +
    bars("Main cause of delays", d, 10) +
    ordBars("How often serious delays happen", d, 9);

  /* =========================
     TRAVEL EXPERIENCE
  ========================= */

  $("g2").innerHTML =
    bars("Most used transport", d, 4) +
    ordBars("One-way travel time", d, 5) +
    ordBars("Waiting time", d, 6) +
    ordBars("Daily transport spend", d, 7) +
    bars("Change in last 6 months", d, 19);

  /* =========================
     SAFETY AND PRIORITIES
  ========================= */

  $("g3").innerHTML =
    bars("Most common safety problem", d, 12) +
    bars("Intervention with greatest impact", d, 17, 8) +
    bars("How to measure success", d, 18, 8);

  /* =========================
     RECOMMENDATIONS
  ========================= */

  const R = [];

  const ti = top1(d, 17);
  const tp = top1(d, 8);
  const tc = top1(d, 10);
  const ts = top1(d, 12);
  const tm = top1(d, 18);

  const wait = ordShare(d, 6, 3);
  const trav = ordShare(d, 5, 3);
  const cost = ordShare(d, 7, 3);

  R.push([
    "high",
    `Make "${ti.name}" the lead intervention`,
    `${ti.share}% of respondents chose it as the change that would help most. The biggest reported problem is "${tp.name}" (${tp.share}%) and the leading cause of delays is "${tc.name}" (${tc.share}%).`,
  ]);

  [
    [
      "Road condition",
      rd,
      "Prioritise rehabilitation of the most-used routes, starting with the areas ranked lowest in the table below.",
    ],
    [
      "Availability of transport",
      av,
      "Add vehicles or routes, or open up terminals and transport hubs, in areas rating availability poorly.",
    ],
    [
      "Reliability",
      rel,
      "Set service standards and enforce them: fixed departure points, vehicle maintenance checks, and operator accountability.",
    ],
  ].forEach(([l, s, a]) => {
    if (s.n && s.avg < 2.75) {
      R.push([
        "high",
        `${l} is rated poorly (${s.avg.toFixed(1)}/5)`,
        `${s.neg}% rate it poor or very poor. ${a}`,
      ]);
    } else if (s.n && s.avg < 3.5) {
      R.push([
        "med",
        `${l} is only average (${s.avg.toFixed(1)}/5)`,
        `${s.neg}% rate it poor or very poor. Keep it on the watch list and track it each quarter.`,
      ]);
    }
  });

  if (saf.n && (saf.neg >= 25 || saf.avg < 3)) {
    R.push([
      "high",
      `Safety needs action (${saf.neg}% feel unsafe)`,
      `The most common safety problem is "${ts.name}" (${ts.share}%). Target enforcement, signage, lighting or operator regulation at this problem first.`,
    ]);
  } else {
    R.push([
      "low",
      "Safety is mostly acceptable",
      `${saf.pos}% feel safe. Still monitor "${ts.name}", the most reported issue.`,
    ]);
  }

  if (wait >= 30) {
    R.push([
      "med",
      `Long waits are common (${wait}% wait over 20 minutes)`,
      "Consider scheduled buses, designated loading points and better route coverage to shorten waits.",
    ]);
  }

  if (trav >= 30) {
    R.push([
      "med",
      `Long journeys (${trav}% travel over 45 minutes one way)`,
      "Look at traffic management and congestion hotspots on the busiest corridors.",
    ]);
  }

  if (cost >= 30) {
    R.push([
      "med",
      `Transport costs are heavy (${cost}% spend over ₦2,000 a day)`,
      "Explore fare regulation, subsidised public buses or cheaper routes for commuters, students and traders.",
    ]);
  }

  if (worse > better) {
    R.push([
      "high",
      `Perception is worsening (${worse}% say worse, ${better}% say better)`,
      "Communicate planned interventions publicly and deliver a few visible quick wins.",
    ]);
  } else if (n) {
    R.push([
      "low",
      `Perception is stable or improving (${better}% better, ${worse}% worse)`,
      "Protect what is working and keep the current trend visible.",
    ]);
  }

  if (dig.n) {
    R.push([
      dig.pos >= 60 ? "low" : "med",
      `Digital monitoring: ${dig.pos}% support it`,
      dig.pos >= 60
        ? `Strong backing. Pilot digital tracking of services and repeat this survey as a baseline. Residents most want progress judged on "${tm.name.toLowerCase()}".`
        : `Support is mixed. Explain the benefits and start with a small pilot. Residents most want progress judged on "${tm.name.toLowerCase()}".`,
    ]);
  }

  const ord = {
    high: 0,
    med: 1,
    low: 2,
  };

  const lab = {
    high: "High priority",
    med: "Medium",
    low: "Positive",
  };

  $("recs").innerHTML = R.sort((a, b) => ord[a[0]] - ord[b[0]])
    .map(
      (r) => `
        <div class="rec ${r[0]}">
          <h3>
            <span class="tag">${lab[r[0]]}</span>
            ${r[1]}
          </h3>

          <p>${r[2]}</p>
        </div>
      `,
    )
    .join("");

  $("small").textContent =
    n < 30
      ? `Only ${n} responses in view. Treat these recommendations as indicative until you have at least 30.`
      : "";

  /* =========================
     AREAS
  ========================= */

  const g = {};

  rows.forEach((r) => {
    if (r[1]) {
      (g[r[1]] = g[r[1]] || []).push(r);
    }
  });

  const ar = Object.entries(g)
    .map(([k, v]) => ({
      k,
      n: v.length,
      s: sc(v, 16),
      p: top1(v, 8).name,
      i: top1(v, 17).name,
      sf: sc(v, 11),
    }))
    .sort((a, b) => (a.s.avg || 9) - (b.s.avg || 9))
    .slice(0, 10);

  $("areas").innerHTML = `
    <table>
      <tr>
        <th>Area</th>
        <th>Responses</th>
        <th>Satisfaction</th>
        <th>Safety</th>
        <th>Top problem</th>
        <th>Top wanted fix</th>
      </tr>

      ${ar
        .map(
          (a) => `
            <tr>
              <td>${a.k}</td>
              <td>${a.n}</td>
              <td>${a.s.n ? a.s.avg.toFixed(1) : "-"}</td>
              <td>${a.sf.n ? a.sf.avg.toFixed(1) : "-"}</td>
              <td>${a.p}</td>
              <td>${a.i}</td>
            </tr>
          `,
        )
        .join("")}
    </table>
  `;
}

/* =========================
   EVENTS
========================= */

$("lga").onchange = render;

$("file").onchange = (e) => {
  const f = e.target.files[0];

  if (!f) {
    return;
  }

  const r = new FileReader();

  r.onload = () => load(r.result, f.name);

  r.readAsText(f);
};

/* =========================
   SAMPLE DATA
========================= */

$("demo").onclick = () => {
  const W = (s) =>
    s.split("|").map((x) => {
      const i = x.lastIndexOf(":");

      return [x.slice(0, i), +x.slice(i + 1)];
    });

  const S = {
    1: W(
      "Warri South:5|Uvwie:4|Sapele:3|Oshimili South:4|Ughelli North:3|Isoko North:2|Bomadi:1|Okpe:2",
    ),

    2: W("Work:5|School/education:3|Business/trading:4|Health/medical:1"),

    3: W(
      "Several times a day:3|Once a day:4|3–5 times a week:3|Occasionally:2",
    ),

    4: W("Keke/tricycle:5|Motorcycle/Okada:4|Bus:3|Taxi:2|Private car:2"),

    5: W(
      "15–30 minutes:4|31–45 minutes:4|46–60 minutes:3|1–2 hours:2|Less than 15 minutes:2",
    ),

    6: W("5–10 minutes:3|11–20 minutes:4|21–30 minutes:3|31–60 minutes:2"),

    7: W("₦500–₦1,000:4|₦1,001–₦2,000:4|₦2,001–₦3,000:2|Less than ₦500:2"),

    8: W(
      "Poor road conditions:6|Traffic congestion:5|High transport fares:4|Reckless driving:2|Flooding/waterlogged roads:2",
    ),

    9: W(
      "Occasionally:3|Frequently:4|Very frequently:3|Almost every day:2|Rarely:1",
    ),

    10: W(
      "Poor roads:5|Traffic congestion:5|Flooding:2|Illegal parking:2|Accidents:1",
    ),

    11: W("Moderately safe:4|Unsafe:4|Safe:3|Very unsafe:2|Very safe:1"),

    12: W(
      "Reckless driving:5|Motorcycle-related risks:4|Speeding:3|Overloading:2|Road accidents:2",
    ),

    13: W("Fair:4|Poor:4|Good:3|Very poor:2|Excellent:1"),

    14: W("Poor:6|Very poor:4|Fair:3|Good:1"),

    15: W("Unreliable:4|Fairly reliable:4|Reliable:2|Very unreliable:2"),

    16: W(
      "Dissatisfied:5|Neutral:4|Very dissatisfied:3|Satisfied:3|Very satisfied:1",
    ),

    17: W(
      "Road rehabilitation:7|Traffic management:3|More public buses:3|Improved drainage:2|Regulation of transport fares:2",
    ),

    18: W(
      "Improved road condition:4|Reduced travel time:3|Reduced road accidents:3|Improved passenger satisfaction:2|Reduced transport fares:2",
    ),

    19: W(
      "Slightly worse:4|About the same:4|Much worse:2|Slightly better:2|Not sure:1",
    ),

    20: W("Support:5|Strongly support:4|Neutral:2|Do not support:1"),
  };

  const pk = (l) => {
    let t = l.reduce((a, b) => a + b[1], 0);
    let x = Math.random() * t;

    for (const o of l) {
      x -= o[1];

      if (x < 0) {
        return o[0];
      }
    }

    return l[0][0];
  };

  const head = [
    "Timestamp",
    ...Array.from({ length: 20 }, (_, i) => "Q" + (i + 1)),
  ].join(",");

  const lines = Array.from(
    { length: 120 },
    () =>
      "2026-01-01," +
      Array.from({ length: 20 }, (_, i) => `"${pk(S[i + 1])}"`).join(","),
  );

  load(head + "\n" + lines.join("\n"), "sample data (randomly generated)");
};

// const $=id=>document.getElementById(id);
// const N=s=>(s||'').toLowerCase().replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
// const SC={11:['very unsafe','unsafe','moderately safe','safe','very safe'],13:['very poor','poor','fair','good','excellent'],14:['very poor','poor','fair','good','excellent'],15:['very unreliable','unreliable','fairly reliable','reliable','very reliable'],16:['very dissatisfied','dissatisfied','neutral','satisfied','very satisfied'],20:['strongly do not support','do not support','neutral','do not support'.replace('do not','support').replace('support support','support'),'strongly support']};
// SC[20]=['strongly do not support','do not support','neutral','support','strongly support'];
// const ORD={5:['less than 15 minutes','15-30 minutes','31-45 minutes','46-60 minutes','1-2 hours','more than 2 hours'],6:['less than 5 minutes','5-10 minutes','11-20 minutes','21-30 minutes','31-60 minutes','more than 1 hour'],7:['less than ₦500','₦500-₦1,000','₦1,001-₦2,000','₦2,001-₦3,000','₦3,001-₦5,000','more than ₦5,000'],9:['never','rarely','occasionally','frequently','very frequently','almost every day']};
// let rows=[];

// function parseCSV(t){const r=[];let row=[],c='',q=false;
// for(let i=0;i<t.length;i++){const ch=t[i];
// if(q){if(ch=='"'){if(t[i+1]=='"'){c+='"';i++}else q=false}else c+=ch}
// else if(ch=='"')q=true;else if(ch==','){row.push(c);c=''}
// else if(ch=='\n'||ch=='\r'){if(ch=='\r'&&t[i+1]=='\n')i++;row.push(c);c='';if(row.some(x=>x.trim()))r.push(row);row=[]}
// else c+=ch}
// if(c||row.length){row.push(c);if(row.some(x=>x.trim()))r.push(row)}return r}

// function load(text,label){
// try{const t=parseCSV(text.replace(/^\uFEFF/,''));
// if(t.length<2)throw 0;
// const off=/timestamp/i.test(t[0][0])?1:0;
// if(t[0].length-off<20)throw 0;
// rows=t.slice(1).map(r=>{const o={};for(let q=1;q<=20;q++)o[q]=(r[off+q-1]||'').trim();return o});
// const l=[...new Set(rows.map(r=>r[1]).filter(Boolean))].sort();
// $('lga').innerHTML='<option value="">All areas</option>'+l.map(x=>`<option>${x}</option>`).join('');
// $('msg').className='';$('msg').textContent=`Loaded ${rows.length} responses from ${label}.`;
// $('dash').style.display='block';render();
// }catch(e){$('msg').className='err';$('msg').textContent='Could not read that file. Use the CSV downloaded from the linked Google Sheet, with all 20 question columns.'}}

// const cnt=(d,q)=>{const m={};d.forEach(r=>{const v=r[q];if(v)m[v]=(m[v]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
// const pct=(a,b)=>b?Math.round(100*a/b):0;
// function sc(d,q){const v=d.map(r=>SC[q].indexOf(N(r[q]))+1).filter(x=>x>0);
// return{n:v.length,avg:v.length?v.reduce((a,b)=>a+b,0)/v.length:0,neg:pct(v.filter(x=>x<=2).length,v.length),pos:pct(v.filter(x=>x>=4).length,v.length)}}
// function ordShare(d,q,minIdx){const v=d.map(r=>ORD[q].indexOf(N(r[q]))).filter(x=>x>=0);return pct(v.filter(x=>x>=minIdx).length,v.length)}
// function bars(title,d,q,max=7){const c=cnt(d,q),tot=c.reduce((a,b)=>a+b[1],0)||1,top=c.slice(0,max);
// return `<div class="card"><h3>${title}</h3>${top.map((x,i)=>`<div class="bar ${i?'':'top'}"><span>${x[0]}</span><i style="width:${100*x[1]/tot/(top[0][1]/tot)}%"></i><span>${pct(x[1],tot)}%</span></div>`).join('')||'<span class="note">No answers</span>'}</div>`}
// function ordBars(title,d,q){const c=cnt(d,q),m=Object.fromEntries(c.map(x=>[N(x[0]),x[1]])),tot=c.reduce((a,b)=>a+b[1],0)||1;
// const mx=Math.max(...ORD[q].map(o=>m[o]||0),1);
// return `<div class="card"><h3>${title}</h3>${ORD[q].map(o=>`<div class="bar"><span>${o}</span><i style="width:${100*(m[o]||0)/mx}%"></i><span>${pct(m[o]||0,tot)}%</span></div>`).join('')}</div>`}
// const top1=(d,q)=>{const c=cnt(d,q);return c.length?{name:c[0][0],share:pct(c[0][1],c.reduce((a,b)=>a+b[1],0))}:{name:'n/a',share:0}};

// function render(){
// const f=$('lga').value,d=f?rows.filter(r=>r[1]==f):rows,n=d.length;
// $('count').textContent=`${n} response${n==1?'':'s'} in view`;
// const sat=sc(d,16),saf=sc(d,11),av=sc(d,13),rd=sc(d,14),rel=sc(d,15),dig=sc(d,20);
// const worse=pct(d.filter(r=>/worse/i.test(r[19])).length,d.filter(r=>r[19]).length);
// const better=pct(d.filter(r=>/better/i.test(r[19])).length,d.filter(r=>r[19]).length);
// const delay=pct(d.filter(r=>ORD[9].indexOf(N(r[9]))>=3).length,d.filter(r=>r[9]).length);
// $('kpis').innerHTML=[[sat.pos+'%','satisfied with services'],[sat.neg+'%','dissatisfied'],[saf.neg+'%','feel unsafe'],[delay+'%','face frequent delays'],[worse+'%','say it is worse than 6 months ago'],[dig.pos+'%','support digital monitoring']].map(k=>`<div class="kpi"><b>${k[0]}</b><small>${k[1]}</small></div>`).join('');

// const col=a=>a>=3.5?'var(--ok)':a>=2.75?'var(--lane)':'var(--bad)';
// $('scores').innerHTML=[['Satisfaction',sat],['Availability',av],['Road condition',rd],['Reliability',rel],['Safety',saf]].map(([l,s])=>`<div class="score"><span>${l}</span><div class="track"><i style="width:${s.avg/5*100}%;background:${col(s.avg)}"></i></div><b>${s.avg.toFixed(1)}</b></div>`).join('')+'<p class="note">Average out of 5. Red is below 2.75, yellow is 2.75 to 3.5, green is above 3.5.</p>';

// $('g1').innerHTML=bars('Biggest transport problem',d,8)+bars('Main cause of delays',d,10)+ordBars('How often serious delays happen',d,9);
// $('g2').innerHTML=bars('Most used transport',d,4)+ordBars('One-way travel time',d,5)+ordBars('Waiting time',d,6)+ordBars('Daily transport spend',d,7)+bars('Change in last 6 months',d,19);
// $('g3').innerHTML=bars('Most common safety problem',d,12)+bars('Intervention with greatest impact',d,17,8)+bars('How to measure success',d,18,8);

// // recommendations
// const R=[],ti=top1(d,17),tp=top1(d,8),tc=top1(d,10),ts=top1(d,12),tm=top1(d,18);
// const wait=ordShare(d,6,3),trav=ordShare(d,5,3),cost=ordShare(d,7,3);
// R.push(['high',`Make "${ti.name}" the lead intervention`,`${ti.share}% of respondents chose it as the change that would help most. The biggest reported problem is "${tp.name}" (${tp.share}%) and the leading cause of delays is "${tc.name}" (${tc.share}%).`]);
// [['Road condition',rd,'Prioritise rehabilitation of the most-used routes, starting with the areas ranked lowest in the table below.'],['Availability of transport',av,'Add vehicles or routes, or open up terminals and transport hubs, in areas rating availability poorly.'],['Reliability',rel,'Set service standards and enforce them: fixed departure points, vehicle maintenance checks, and operator accountability.']].forEach(([l,s,a])=>{
// if(s.n&&s.avg<2.75)R.push(['high',`${l} is rated poorly (${s.avg.toFixed(1)}/5)`,`${s.neg}% rate it poor or very poor. ${a}`]);
// else if(s.n&&s.avg<3.5)R.push(['med',`${l} is only average (${s.avg.toFixed(1)}/5)`,`${s.neg}% rate it poor or very poor. Keep it on the watch list and track it each quarter.`])});
// if(saf.n&&(saf.neg>=25||saf.avg<3))R.push(['high',`Safety needs action (${saf.neg}% feel unsafe)`,`The most common safety problem is "${ts.name}" (${ts.share}%). Target enforcement, signage, lighting or operator regulation at this problem first.`]);
// else R.push(['low','Safety is mostly acceptable',`${saf.pos}% feel safe. Still monitor "${ts.name}", the most reported issue.`]);
// if(wait>=30)R.push(['med',`Long waits are common (${wait}% wait over 20 minutes)`,'Consider scheduled buses, designated loading points and better route coverage to shorten waits.']);
// if(trav>=30)R.push(['med',`Long journeys (${trav}% travel over 45 minutes one way)`,'Look at traffic management and congestion hotspots on the busiest corridors.']);
// if(cost>=30)R.push(['med',`Transport costs are heavy (${cost}% spend over ₦2,000 a day)`,'Explore fare regulation, subsidised public buses or cheaper routes for commuters, students and traders.']);
// if(worse>better)R.push(['high',`Perception is worsening (${worse}% say worse, ${better}% say better)`,'Communicate planned interventions publicly and deliver a few visible quick wins.']);
// else if(n)R.push(['low',`Perception is stable or improving (${better}% better, ${worse}% worse)`,'Protect what is working and keep the current trend visible.']);
// if(dig.n)R.push([dig.pos>=60?'low':'med',`Digital monitoring: ${dig.pos}% support it`,dig.pos>=60?`Strong backing. Pilot digital tracking of services and repeat this survey as a baseline. Residents most want progress judged on "${tm.name.toLowerCase()}".`:`Support is mixed. Explain the benefits and start with a small pilot. Residents most want progress judged on "${tm.name.toLowerCase()}".`]);
// const ord={high:0,med:1,low:2},lab={high:'High priority',med:'Medium',low:'Positive'};
// $('recs').innerHTML=R.sort((a,b)=>ord[a[0]]-ord[b[0]]).map(r=>`<div class="rec ${r[0]}"><h3><span class="tag">${lab[r[0]]}</span>${r[1]}</h3><p>${r[2]}</p></div>`).join('');
// $('small').textContent=n<30?`Only ${n} responses in view. Treat these recommendations as indicative until you have at least 30.`:'';

// // areas
// const g={};rows.forEach(r=>{if(r[1])(g[r[1]]=g[r[1]]||[]).push(r)});
// const ar=Object.entries(g).map(([k,v])=>({k,n:v.length,s:sc(v,16),p:top1(v,8).name,i:top1(v,17).name,sf:sc(v,11)})).sort((a,b)=>(a.s.avg||9)-(b.s.avg||9)).slice(0,10);
// $('areas').innerHTML=`<table><tr><th>Area</th><th>Responses</th><th>Satisfaction</th><th>Safety</th><th>Top problem</th><th>Top wanted fix</th></tr>${ar.map(a=>`<tr><td>${a.k}</td><td>${a.n}</td><td>${a.s.n?a.s.avg.toFixed(1):'-'}</td><td>${a.sf.n?a.sf.avg.toFixed(1):'-'}</td><td>${a.p}</td><td>${a.i}</td></tr>`).join('')}</table>`;
// }

// // events
// $('lga').onchange=render;
// $('file').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>load(r.result,f.name);r.readAsText(f)};

// // sample data
// $('demo').onclick=()=>{
// const W=s=>s.split('|').map(x=>{const i=x.lastIndexOf(':');return[x.slice(0,i),+x.slice(i+1)]});
// const S={1:W('Warri South:5|Uvwie:4|Sapele:3|Oshimili South:4|Ughelli North:3|Isoko North:2|Bomadi:1|Okpe:2'),2:W('Work:5|School/education:3|Business/trading:4|Health/medical:1'),3:W('Several times a day:3|Once a day:4|3–5 times a week:3|Occasionally:2'),4:W('Keke/tricycle:5|Motorcycle/Okada:4|Bus:3|Taxi:2|Private car:2'),5:W('15–30 minutes:4|31–45 minutes:4|46–60 minutes:3|1–2 hours:2|Less than 15 minutes:2'),6:W('5–10 minutes:3|11–20 minutes:4|21–30 minutes:3|31–60 minutes:2'),7:W('₦500–₦1,000:4|₦1,001–₦2,000:4|₦2,001–₦3,000:2|Less than ₦500:2'),8:W('Poor road conditions:6|Traffic congestion:5|High transport fares:4|Reckless driving:2|Flooding/waterlogged roads:2'),9:W('Occasionally:3|Frequently:4|Very frequently:3|Almost every day:2|Rarely:1'),10:W('Poor roads:5|Traffic congestion:5|Flooding:2|Illegal parking:2|Accidents:1'),11:W('Moderately safe:4|Unsafe:4|Safe:3|Very unsafe:2|Very safe:1'),12:W('Reckless driving:5|Motorcycle-related risks:4|Speeding:3|Overloading:2|Road accidents:2'),13:W('Fair:4|Poor:4|Good:3|Very poor:2|Excellent:1'),14:W('Poor:6|Very poor:4|Fair:3|Good:1'),15:W('Unreliable:4|Fairly reliable:4|Reliable:2|Very unreliable:2'),16:W('Dissatisfied:5|Neutral:4|Very dissatisfied:3|Satisfied:3|Very satisfied:1'),17:W('Road rehabilitation:7|Traffic management:3|More public buses:3|Improved drainage:2|Regulation of transport fares:2'),18:W('Improved road condition:4|Reduced travel time:3|Reduced road accidents:3|Improved passenger satisfaction:2|Reduced transport fares:2'),19:W('Slightly worse:4|About the same:4|Much worse:2|Slightly better:2|Not sure:1'),20:W('Support:5|Strongly support:4|Neutral:2|Do not support:1')};
// const pk=l=>{let t=l.reduce((a,b)=>a+b[1],0),x=Math.random()*t;for(const o of l){x-=o[1];if(x<0)return o[0]}return l[0][0]};
// const head=['Timestamp',...Array.from({length:20},(_,i)=>'Q'+(i+1))].join(',');
// const lines=Array.from({length:120},()=>'2026-01-01,'+Array.from({length:20},(_,i)=>'"'+pk(S[i+1])+'"').join(','));
// load(head+'\n'+lines.join('\n'),'sample data (randomly generated)')};
