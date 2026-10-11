# Gates: airbase anatomy figure

OWNS: **

Scope: a complete, orbitable, highly detailed black-and-white isometric SVG airport/airbase figure with live aircraft, ground vehicles, people, parking and buildings, verified by captures and the line-end audit.

- [x] G1: dark page builds and inlines the scene bundle
  CHECK: node build.mjs && node -e "const s=require('fs').readFileSync('airbase.html','utf8');if(!/data-scene/.test(s)||s.length<200000)process.exit(1);console.log('build ok',s.length)"
  EXPECT: build ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=f7cef1e0d395abcd2cb3aaf9e947b4d736c33c3b5ee019f19ca7a948ba4f1807; exit=0; EXPECT=matched; output-sha256=b5ef0d8ac24dc909cdd3c6acda29f70087e6cb4e79eee6b313a409981aef3a6f; output-bytes=51; shell=/bin/sh; cwd=/home/ubuntu/repos/airbase; path=8928e94b2b34/11 entries

- [x] G2: light page builds
  CHECK: node build.mjs --light && node -e "require('fs').statSync('airbase-light.html');console.log('light ok')"
  EXPECT: light ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=dabbbe02845d201badd550fc280d821a0229d95a20607f77d79fec103fab0594; exit=0; EXPECT=matched; output-sha256=80e21e3a64e8dea00091e517b46b125dc3eb804741e021c44229b9cae72dbd8e; output-bytes=44; shell=/bin/sh; cwd=/home/ubuntu/repos/airbase; path=8928e94b2b34/11 entries

- [x] G3: no line ends in mid-air (dark)
  CHECK: node scripts/lines.mjs airbase.html --out shots/lines.png
  EXPECT: line ends: 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=42d7803e079df44abdc8c70f547f34b1e386aba5776f2dc7d00df981e2af3661; exit=0; EXPECT=matched; output-sha256=f214bfc241b5435337ff909bd6b075669c0d5f5b72f2e3aa3614edba6a0a21f5; output-bytes=80; shell=/bin/sh; cwd=/home/ubuntu/repos/airbase; path=8928e94b2b34/11 entries

- [x] G4: no line ends in mid-air (light)
  CHECK: node scripts/lines.mjs airbase-light.html --out shots/lines-light.png
  EXPECT: line ends: 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=f337fc572b5527e7b087c33116f4e2a15733f90e968c80fa3343ecb6ef834e03; exit=0; EXPECT=matched; output-sha256=acf8e3c6f07b3a3dd2d7e0793e2ff2b4ebf335482d206e26a3861421d9b43c57; output-bytes=86; shell=/bin/sh; cwd=/home/ubuntu/repos/airbase; path=8928e94b2b34/11 entries

- [x] G5: page runs clean in headless Chrome at home camera and after an orbit (no console errors)
  CHECK: node scripts/capture.mjs "airbase.html#az=210&el=40" --out shots/orbit.png --wait 2500
  EXPECT: console: clean
  EVIDENCE: automatic-evidence=v1; definition-sha256=bcc53da63912ce60d0e3edd3e0d37af67067dc1c0385517584d06a6f0fd7c4d0; exit=0; EXPECT=matched; output-sha256=a0f917e0840001a9fc3624403503b09c72fcf62170715b641653adc8b57c6e88; output-bytes=122; shell=/bin/sh; cwd=/home/ubuntu/repos/airbase; path=8928e94b2b34/11 entries

- [x] G6: scene part count meets the Epic bar (>=300 placed parts of >=45 kinds at home camera)
  CHECK: node scripts/count.mjs
  EXPECT: parts ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=31e96bca3efe6a6c016c0c191c46c7602b9a49afb7b5180fe7039dec4fff8b27; exit=0; EXPECT=matched; output-sha256=c544b0d7bd410720db6f324c1540531e61b29ce5420f4882c65feaf55161c146; output-bytes=37; shell=/bin/sh; cwd=/home/ubuntu/repos/airbase; path=8928e94b2b34/11 entries

- [x] G7: aircraft complete a full ground-air cycle (gate -> takeoff -> airborne, arrival -> gate) in the model
  CHECK: node scripts/cycle-check.mjs
  EXPECT: cycle ok
  EVIDENCE: automatic-evidence=v1; definition-sha256=f08f91a505ade15140716b2275add44377b0877384976258df44eb001bfcf9d1; exit=0; EXPECT=matched; output-sha256=bb87c7fb87db18495eebb7f15bf2f6c53cf124137bce723dfb17d7eb64259722; output-bytes=125; shell=/bin/sh; cwd=/home/ubuntu/repos/airbase; path=8928e94b2b34/11 entries

- [x] G8: every area in PLAN.md is drawn and reviewed at 4x in both themes (manual: PNGs read)
  EVIDENCE: shots/close-terminal.png, close-military.png, close-cargo.png, close-fuel-hangar.png, stand-pier.png (dark, 4x–7x), shots/light.png + final-light-1080.png (light), shots/orbit.png (az 210), shots/phone.png (390px) — read by Devin 2026-10-11; fixes applied: slabOf plan bug (invisible buildings), stand offsets, 12 floating line ends, phone footer overlap

- [x] G9: 1920x1080 close-up still and a short MP4 delivered to Atharv
  EVIDENCE: shots/final-dark-1080.png, shots/final-light-1080.png, shots/airbase-apron.mp4 (14 s, 1920x1080, 420 frames, no exceptions) — attached in session 364396f2
