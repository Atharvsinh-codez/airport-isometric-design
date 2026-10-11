// World truth for the airbase. 1 unit ≈ 3.1 m on the ground plan; aircraft and vehicles are drawn 3.8× over scale.
export const UNIT_M = 3.1;
export const OVER = 4.4;
export const U = (metres) => (metres / UNIT_M) * OVER;   // vehicle metres → units (over scale)
export const G = (metres) => metres / UNIT_M;            // ground metres → units (true scale)

export const PLATE = { x0: -580, x1: 516, y0: -360, y1: 330 };
export const RUNWAY = { y: -202, x0: -450, x1: 450, w: 15, len_m: 2800 };
export const TAXI_A = { y: -162, w: 8 };            // parallel taxiway south of the runway
export const TAXI_M = { y: -237, w: 7, x0: 60, x1: 520 }; // military parallel, north side
export const APRON_LANE = { y: -133 };               // apron taxilane in front of the stands
export const STUBS = [-420, -300, -150, 0, 150, 300, 420];
export const EXITS = [-230, 230];                    // high-speed exits (angled)
export const PIER = { x0: -290, x1: 290, y0: 0, y1: 26, h: 4 };
export const HALL = { x0: -210, x1: 210, y0: 34, y1: 92, h: 14 };
export const STANDS = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, x: -266 + 76 * i, y: i === 2 || i === 5 ? -66 : -44, big: i === 2 || i === 5 }));
export const CARGO = { shed: { x0: 320, x1: 450, y0: 0, y1: 50, h: 9 }, stand: { x: 385, y: -62 } };
export const HANGAR = { x0: -570, x1: -440, y0: -70, y1: 20, h: 18 };
export const FIRE = { x0: -420, x1: -360, y0: -40, y1: 10, h: 7 };
export const FUEL = { x0: -570, x1: -470, y0: 40, y1: 110 };
export const TOWER = { x: 252, y: 62, h: 74 };
export const GATE_X = 400;
export const MULTI = { x0: -330, x1: -186, y0: 128, y1: 268, decks: 3, dh: 5.2 };
export const RAIL = { y: 318, x0: -580, x1: 516, plat: { x0: -120, x1: 120, y0: 307, y1: 313 } };
export const WATCH = { x: 150, y: -300, h: 16 };
export const ROAD = { y0: 100, y1: 112, x0: -340, x1: 360 };
export const CARPARK = { x0: -170, x1: 60, y0: 128, y1: 268 };
export const ROUNDABOUT = { x: 300, y: 190, r: 18 };
export const RENTAL = { x0: 110, x1: 250, y0: 205, y1: 280 };
export const MIL = { shelters: [220, 290, 360, 430], y0: -332, y1: -282, line: { y: -260, x0: 180, x1: 470 }, heli: { x: -120, y: -297 }, bunker: { x: -440, y: -312 }, radar: { x: -300, y: -307 } };

export const HEADINGS = 16;                           // discrete yaw steps for pre-rendered vehicles
export const AIRCRAFT = {
  a320: { name: "Airbus A320", len: 37.6, span: 35.8, h: 11.8, dia: 3.95, engines: 2, cruiseKt: 450, vr: 140, pax: 180, tail: "conv" },
  b737: { name: "Boeing 737-800", len: 39.5, span: 35.8, h: 12.5, dia: 3.76, engines: 2, cruiseKt: 450, vr: 145, pax: 189, tail: "conv" },
  b777: { name: "Boeing 777-300ER", len: 73.9, span: 64.8, h: 18.5, dia: 6.2, engines: 2, cruiseKt: 490, vr: 165, pax: 396, tail: "conv" },
  b747f: { name: "Boeing 747-8F", len: 76.3, span: 68.4, h: 19.4, dia: 6.5, engines: 4, cruiseKt: 490, vr: 170, pax: 0, tail: "conv", hump: true },
  atr72: { name: "ATR 72-600", len: 27.2, span: 27.1, h: 7.7, dia: 2.9, engines: 2, cruiseKt: 275, vr: 110, pax: 70, tail: "T", highWing: true, prop: true },
  f16: { name: "F-16C Fighting Falcon", len: 15.0, span: 9.96, h: 5.1, dia: 1.6, engines: 1, cruiseKt: 530, vr: 160, pax: 1, tail: "fighter" },
  uh60: { name: "UH-60 Black Hawk", len: 19.8, span: 16.4, h: 5.1, dia: 2.4, engines: 2, cruiseKt: 150, vr: 0, pax: 11, tail: "heli" },
};
export const GSE = {
  tug: { name: "pushback tug", len: 7, wid: 2.6, h: 2.2 },
  belt: { name: "belt loader", len: 6.5, wid: 2.2, h: 2.6 },
  catering: { name: "catering truck", len: 8.5, wid: 2.5, h: 3.6 },
  bowser: { name: "fuel bowser", len: 11, wid: 2.5, h: 3.4 },
  bagtrain: { name: "baggage train", len: 14, wid: 1.8, h: 1.8 },
  stairs: { name: "passenger stairs", len: 6, wid: 2.4, h: 4.2 },
  bus: { name: "apron bus", len: 12, wid: 2.6, h: 3.1 },
  firetruck: { name: "crash tender", len: 11.5, wid: 3, h: 3.8 },
  car: { name: "car", len: 4.6, wid: 1.9, h: 1.5 },
  coach: { name: "coach", len: 12, wid: 2.5, h: 3.4 },
  follow: { name: "follow-me car", len: 4.6, wid: 1.9, h: 1.7 },
  suv: { name: "SUV", len: 4.9, wid: 1.95, h: 1.8 },
  hatch: { name: "hatchback", len: 4.1, wid: 1.8, h: 1.5 },
  van: { name: "van", len: 5.4, wid: 2.0, h: 2.4 },
  pickup: { name: "pickup", len: 5.4, wid: 1.95, h: 1.85 },
  truck: { name: "semi-trailer truck", len: 16.5, wid: 2.55, h: 4.0 },
  train: { name: "airport express car", len: 22, wid: 2.9, h: 3.8 },
  police: { name: "police car", len: 4.8, wid: 1.9, h: 1.5 },
};
export const KT_TO_U = (kt) => (kt * 0.5144) / UNIT_M;   // knots → units per second (true ground scale)
export const SIM_RATE = 2.4;                             // the clock runs this much faster than real time
