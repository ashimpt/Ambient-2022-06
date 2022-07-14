const scoreList = [
  "2022-05-21-frog-2.js",
  "2022-05-14-snail-2.js",
  "2022-03-30-pluto-3.js",
  "2021-12-28-13-2.js",
  "2022-02-14-kotatsu-2.js",
  "2022-04-21-swing-2.js",
  "2021-12-03-13tet-2.js",
  "2022-02-07-snow-2.js",
  "2022-06-08-cloud.js",
  "2022-06-24-rust.js",
  "2021-12-20-ring-2.js",
  "2022-04-20-morning.js",
  "-",
  "2022-05-05-cr-2.js",
  // "2022-07-11-us.js",
  // "2022-07-12.js",
  "template.js",
];

const title = document.title;
const q = (s) => document.querySelector(s);
let scoreUrl;
function setScoreUrl(s) {
  scoreUrl = s;
  location.hash = s;
  q("#url").value = s;
}

addEventListener("load", () => {
  // events
  window.onbeforeunload = () => (q("#unload").checked ? false : undefined);
  q("canvas#analyser").addEventListener("click", startAnalyser);
  q("#url").onkeyup = (e) => (e.key == "Enter" ? start(e, e.target.value) : 0);
  q("#url-button").onclick = (e) => start(e, q("#url").value);

  // scoreUrl
  scoreList.reverse();
  if (location.hash) setScoreUrl(location.hash.substring(1));
  else setScoreUrl(scoreList.at(-1));

  // links
  const setHash = (e) => (e.target.hash = scoreUrl);
  for (const v of ["?", "?autostart"]) output(v, v, setHash, 0);
  output("-");

  for (const url of scoreList) {
    if (url == "-") output("-");
    else output("✏️ " + url, "#", (e) => start(e, url));
  }
  output("-");

  // live server
  if (/autostart/.test(location.search)) {
    q("input#unload").checked = false;
    start();
  }
});

function output(str, url, callback, hasMemo = 1) {
  const container = document.createElement("div");

  const element = document.createElement(url ? "a" : "div");
  if (url) element.href = url;
  element.textContent = str;
  if (callback) element.addEventListener("click", callback);
  container.append(element);

  if (url && hasMemo) {
    const memo = document.createElement("div");
    memo.classList.add("memo");
    memo.contentEditable = true;
    container.append(memo);
  }

  q("div#output").prepend(container);
  return element;
}

function start(e, url) {
  if (/⏳/.test(document.title)) return;
  document.title = "⏳" + title;

  if (e) e.preventDefault();
  if (url) setScoreUrl(url);
  q("audio").pause();

  let settings, objectUrl;
  // link
  const text = `${scoreUrl}.wav (${new Date().toLocaleTimeString()})`;
  const a = output(text, "#", (e) => {
    e.preventDefault();
    if (!objectUrl) return;
    setScoreUrl(settings.scoreUrl);
    playWav(objectUrl);
    console.log(JSON.stringify(settings, null, 1));
  });
  a.disabled = true;

  // worker
  console.group(scoreUrl);
  const worker = new Worker("worker.js");
  worker.postMessage(scoreUrl);

  worker.onmessage = (e) => {
    if (e.data.scoreUrl) settings = e.data;
    else {
      const blob = new Blob([e.data], { type: "audio/wav" });
      a.href = objectUrl = URL.createObjectURL(blob);
      a.download = scoreUrl + ".wav";

      console.log(settings);
      playWav(objectUrl);
      terminate();
    }
  };

  worker.onerror = (e) => {
    output(e.message);
    console.error("lineno " + e.lineno, e.message, e);
    terminate();
  };

  const terminate = () => {
    worker.terminate();
    console.groupEnd();
    document.title = title;
  };
}

function playWav(url) {
  q("source").src = url;
  q("audio").load();
  q("audio").play().catch(console.log);
}

let analyser;
function startAnalyser() {
  if (analyser) return;
  analyser = new Analyser(q("canvas#analyser"), null);
  analyser.connectAudioElement(q("audio"));
  q("canvas#analyser").removeEventListener("click", startAnalyser);
}
