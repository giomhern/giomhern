import { scaleFactor, dialogueData } from "./constants";
import { k } from "./kaboomCtx";
import { displayDialogue, setCamScale } from "./utils";
import { setupTouchControls } from "./touchControls";

const touchControls = setupTouchControls(document.getElementById("touch-controls"));

const characterSpriteAsset = k.loadSprite("adventure-sprites", "./adventure-sprites.png", {
  sliceX: 39,
  sliceY: 31,
  // hookup to specific animations
  anims: {
    "idle-down": 936,
    "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
    "idle-side": 975,
    "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
    "idle-up": 1014,
    "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
  },
});

k.loadShader("dark-brown-hair", undefined, `
  uniform vec2 u_texel;

  bool matches(vec4 pixel, vec3 rgb) {
    return pixel.a > 0.5 && distance(pixel.rgb, rgb / 255.0) < 0.01;
  }

  vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
    vec4 pixel = def_frag();
    bool hair = matches(pixel, vec3(178.0, 92.0, 52.0));
    bool hairOutline = false;
    if (matches(pixel, vec3(49.0, 16.0, 71.0))) {
      bool adjacentHair = false;
      bool diagonalHair = false;
      bool adjacentSkin = false;
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          if (x == 0 && y == 0) continue;
          vec4 neighbor = texture2D(tex, uv + vec2(float(x), float(y)) * u_texel);
          bool neighborHair = matches(neighbor, vec3(178.0, 92.0, 52.0));
          if (x == 0 || y == 0) {
            adjacentHair = adjacentHair || neighborHair;
            adjacentSkin = adjacentSkin || matches(neighbor, vec3(226.0, 174.0, 96.0));
          } else {
            diagonalHair = diagonalHair || neighborHair;
          }
        }
      }
      // Preserve facial features that only touch the hair diagonally.
      hairOutline = adjacentHair || (diagonalHair && !adjacentSkin);
    }
    if (hair || hairOutline) {
      pixel.rgb = vec3(30.0, 20.0, 16.0) / 255.0;
    }
    return pixel;
  }
`);

k.loadSprite("map-tiles", "./adventure-sprites.png", {
  sliceX: 39,
  sliceY: 31,
});
k.loadSpriteAtlas("./adventure-sprites.png", {
  "living-room-sofa": { x: 496, y: 80, width: 32, height: 16 },
  "bedroom-chair": { x: 544, y: 48, width: 16, height: 32 },
  "bedroom-certificate": { x: 528, y: 16, width: 16, height: 16 },
});
k.loadSpriteAtlas("./furniture-sprites.png", {
  "hallway-plant": { x: 192, y: 112, width: 16, height: 48 },
  "hallway-shelf": { x: 168, y: 48, width: 24, height: 32 },
  "hallway-bench": { x: 144, y: 112, width: 32, height: 16 },
  "hallway-rug": { x: 128, y: 80, width: 32, height: 16 },
  "bedroom-curtains": { x: 128, y: 160, width: 32, height: 32 },
  "bedroom-bed": { x: 0, y: 128, width: 48, height: 48 },
  "bedroom-tv": { x: 208, y: 0, width: 10, height: 48 },
  "living-room-tv": { x: 192, y: 80, width: 32, height: 32 },
  "bedroom-rug": { x: 96, y: 128, width: 32, height: 48 },
  "living-room-rug": { x: 48, y: 144, width: 48, height: 32 },
  "living-room-cabinet": { x: 128, y: 128, width: 48, height: 32 },
  "living-room-aquarium": { x: 160, y: 160, width: 48, height: 32 },
  "bedroom-easel": { x: 48, y: 176, width: 16, height: 32 },
  "bedroom-side-desk": { x: 32, y: 176, width: 16, height: 32 },
  "bedroom-stool": { x: 128, y: 48, width: 16, height: 32 },
});
k.loadSpriteAtlas("./small-items-sprites.png", {
  "bedroom-window": { x: 0, y: 16, width: 16, height: 32 },
  "bedroom-board": { x: 0, y: 64, width: 32, height: 16 },
});
k.setBackground(k.Color.fromHex("#302321"));
k.loadShader("map-background", undefined, `
  vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
    vec4 pixel = def_frag();
    // Edge tiles contain the original purple background as opaque pixels.
    if (distance(pixel.rgb, vec3(49.0, 16.0, 71.0) / 255.0) < 0.01) {
      pixel.rgb = vec3(48.0, 35.0, 33.0) / 255.0;
    }
    return pixel;
  }
`);

k.scene("main", async () => {
  // Mobile connections can finish the map request before the character texture.
  const characterSpriteData = await characterSpriteAsset;
  // async function to load the map
  const mapData = await (await fetch("./map.json")).json();
  const layers = mapData.layers;
  const wallHeight =
    mapData.properties?.find((property) => property.name === "wallHeight")
      ?.value ?? 1;

  const map = k.add([
    // position of game object when displayed
    k.pos(0),
    k.scale(scaleFactor),
  ]);

  // Render the editable map layers so furniture and collision data stay together.
  for (const layer of layers) {
    if (layer.type !== "tilelayer" || !layer.visible) continue;
    layer.data.forEach((tile, index) => {
      if (!tile) return;
      const isWall = [27, 28, 29].includes(tile);
      map.add([
        k.sprite("map-tiles", { frame: tile - 1 }),
        k.shader("map-background"),
        k.scale(1, isWall ? wallHeight : 1),
        k.pos(
          (index % layer.width) * mapData.tilewidth,
          // Extend walls upward without moving the floor-facing edge.
          Math.floor(index / layer.width) * mapData.tileheight -
            (isWall ? (wallHeight - 1) * mapData.tileheight : 0),
        ),
      ]);
    });
  }

  // Center the matching horizontal rug in the living room, with no collision.
  const boundaries = layers.find(
    (layer) => layer.name === "boundaries",
  ).objects;
  const livingRoomWall = boundaries.find((boundary) => boundary.id === 16);
  const livingRoomBottom = boundaries.find((boundary) => boundary.id === 4).y;
  const livingRoomCenter = livingRoomWall.x + livingRoomWall.width / 2;
  const livingRoomRugTop =
    (livingRoomWall.y + livingRoomWall.height + livingRoomBottom) / 2 - 16;
  map.add([
    k.sprite("living-room-rug"),
    k.pos(livingRoomCenter - 24, livingRoomRugTop + 6),
  ]);

  // Share the same close-set windows, mirrored right pane, and curtains in both rooms.
  function addWindowSet(wall, center) {
    const windowScale = wall.height / 32;
    for (let index = 0; index < 2; index++) {
      map.add([
        k.sprite("bedroom-window", { flipX: index === 1 }),
        k.scale(windowScale),
        k.pos(center - 14 * windowScale + index * 12 * windowScale, wall.y),
      ]);
    }
    map.add([
      k.sprite("bedroom-curtains"),
      k.scale(windowScale),
      k.pos(center - 16 * windowScale, wall.y),
      k.z(1),
    ]);
  }
  const livingWindowCenters = [0.25, 0.75].map(
    (fraction) => livingRoomWall.x + livingRoomWall.width * fraction,
  );
  for (const center of livingWindowCenters) {
    addWindowSet(livingRoomWall, center);
  }
  const livingFurnitureScale = 0.75;
  for (const [index, sprite] of [
    "living-room-cabinet",
    "living-room-aquarium",
  ].entries()) {
    map.add([
      k.sprite(sprite),
      k.pos(
        livingWindowCenters[index] - 24 * livingFurnitureScale,
        livingRoomWall.y + livingRoomWall.height - 8,
      ),
      k.scale(livingFurnitureScale),
      k.z(2),
      k.area({ shape: new k.Rect(k.vec2(2, 16), 44, 16) }),
      k.body({ isStatic: true }),
    ]);
  }
  // Center the larger sofa slightly lower on the rug.
  const sofaScale = 1.25;
  map.add([
    k.sprite("living-room-sofa"),
    k.pos(livingRoomCenter - 16 * sofaScale, livingRoomRugTop - 3),
    k.scale(sofaScale),
    k.z(2),
    k.area({ shape: new k.Rect(k.vec2(0), 32, 16) }),
    k.body({ isStatic: true }),
  ]);
  // The back-facing TV sits below the sofa, with its screen facing the seats.
  const livingRoomTvScale = 0.75;
  const livingRoomTvX = livingRoomCenter - 16 * livingRoomTvScale;
  const livingRoomTvY = livingRoomBottom - 32 * livingRoomTvScale - 10;
  // Share the player's parent so depth can follow which side they stand on.
  const livingRoomTv = k.add([
    k.sprite("living-room-tv"),
    k.pos(
      map.pos.x + livingRoomTvX * scaleFactor,
      map.pos.y + livingRoomTvY * scaleFactor,
    ),
    k.scale(scaleFactor * livingRoomTvScale),
    k.z(2),
    // Only the bottom edge blocks movement; the screen can overlap the player.
    k.area({ shape: new k.Rect(k.vec2(2, 28), 28, 4) }),
    k.body({ isStatic: true }),
  ]);
  const bedroomWall = boundaries.find((boundary) => boundary.id === 13);
  addWindowSet(bedroomWall, bedroomWall.x + bedroomWall.width / 4);
  const boardCenter = bedroomWall.x + bedroomWall.width * 0.75;
  const certificateScale = 0.75;
  map.add([
    k.sprite("bedroom-certificate"),
    k.pos(
      bedroomWall.x + bedroomWall.width / 2 - 8 * certificateScale - 2,
      bedroomWall.y + (bedroomWall.height - 16 * certificateScale) / 2,
    ),
    k.scale(certificateScale),
  ]);
  map.add([
    k.sprite("bedroom-board"),
    k.pos(boardCenter - 16, bedroomWall.y + (bedroomWall.height - 16) / 2),
  ]);

  const bedroomRight = bedroomWall.x + bedroomWall.width;
  const bedroomBottom = layers
    .find((layer) => layer.name === "boundaries")
    .objects.find((boundary) => boundary.id === 15).y;
  const bedroomFloorTop = bedroomWall.y + bedroomWall.height;
  // The player's collision box stops their center two units below the wall.
  // Keep wall interactions around that reachable position, directly below the art.
  const approachZones = [
    { tag: "cs-degree", x: bedroomWall.x + bedroomWall.width / 2 - 2,
      halfWidth: 6, top: bedroomFloorTop, bottom: bedroomFloorTop + 4 },
    { tag: "bedroom-board", x: boardCenter,
      halfWidth: 12, top: bedroomFloorTop, bottom: bedroomFloorTop + 4 },
    { tag: "tv", x: livingRoomCenter,
      halfWidth: 7, top: livingRoomTvY + 6, bottom: livingRoomTvY + 18 },
  ];
  let activeApproaches = new Set();
  // Draw the rug before furniture, without a collision area.
  map.add([
    k.sprite("bedroom-rug"),
    k.pos(
      (bedroomWall.x + bedroomRight) / 2 - 16,
      (bedroomFloorTop + bedroomBottom) / 2 - 24,
    ),
  ]);
  const bedroomFurnitureScale = 0.75;
  // Place the side-facing desk along the left wall, behind the hallway plant.
  map.add([
    k.sprite("bedroom-side-desk"),
    k.pos(bedroomWall.x - 1.5, bedroomFloorTop),
    k.scale(bedroomFurnitureScale),
    k.area({ shape: new k.Rect(k.vec2(3, 4), 10, 28) }),
    k.body({ isStatic: true }),
  ]);
  map.add([
    k.sprite("bedroom-easel"),
    k.pos(boardCenter - 8 * bedroomFurnitureScale + 4, bedroomFloorTop + 12),
    k.scale(bedroomFurnitureScale),
    k.area({ shape: new k.Rect(k.vec2(0), 16, 32) }),
    k.body({ isStatic: true }),
  ]);
  const bedLeft = bedroomRight - 48 * bedroomFurnitureScale;
  const bedTop = bedroomBottom - 48 * bedroomFurnitureScale;
  // Use the drawn horizontal bed variant, with the headboard against the right wall.
  map.add([
    k.sprite("bedroom-bed"),
    k.pos(bedLeft, bedTop),
    k.scale(bedroomFurnitureScale),
  ]);
  map.add([
    k.pos(
      bedLeft + 2 * bedroomFurnitureScale,
      bedTop + 6 * bedroomFurnitureScale,
    ),
    k.scale(bedroomFurnitureScale),
    k.area({ shape: new k.Rect(k.vec2(0), 44, 40) }),
    k.body({ isStatic: true }),
    "bed",
  ]);
  // The side-view TV already faces the bed; keep its original orientation.
  const tvLeft = bedLeft - 10 * bedroomFurnitureScale - 4;
  const tvTop = bedTop;
  map.add([
    k.sprite("bedroom-tv"),
    k.pos(tvLeft, tvTop),
    k.scale(bedroomFurnitureScale),
  ]);
  map.add([
    k.pos(tvLeft + bedroomFurnitureScale, tvTop + 16 * bedroomFurnitureScale),
    k.scale(bedroomFurnitureScale),
    k.area({ shape: new k.Rect(k.vec2(0), 8, 32) }),
    k.body({ isStatic: true }),
  ]);

  // Draw the stool first so the computer overlaps it in front.
  map.add([
    k.sprite("bedroom-stool"),
    k.pos(
      (bedroomWall.x + tvLeft) / 2 - 8 * bedroomFurnitureScale + 0.25,
      bedroomBottom - 48 * bedroomFurnitureScale + 8,
    ),
    k.scale(bedroomFurnitureScale),
  ]);
  // Center the computer in the open space to the left of the TV and bed.
  map.add([
    k.sprite("bedroom-chair"),
    k.pos(
      (bedroomWall.x + tvLeft) / 2 - 8 * bedroomFurnitureScale,
      bedroomBottom - 32 * bedroomFurnitureScale + 1,
    ),
    k.scale(bedroomFurnitureScale),
  ]);
  // Treat the whole computer-and-stool setup as one solid interaction section.
  const computerSectionTop = bedroomBottom - 48 * bedroomFurnitureScale + 8;
  map.add([
    k.pos(
      (bedroomWall.x + tvLeft) / 2 - 8 * bedroomFurnitureScale,
      computerSectionTop,
    ),
    k.area({
      shape: new k.Rect(
        k.vec2(0),
        16 * bedroomFurnitureScale + 0.25,
        bedroomBottom + 1 - computerSectionTop,
      ),
    }),
    k.body({ isStatic: true }),
    "pc",
  ]);

  // Align the solid pot edges with the hallway's four corners.
  const plantScale = 2 / 3;
  const hallway = { left: 176, right: 224, top: 112, bottom: 160 };
  // The rug belongs to the floor layer and has no collision area.
  map.add([
    k.sprite("hallway-rug"),
    k.pos(
      (hallway.left + hallway.right) / 2 - 16,
      (hallway.top + hallway.bottom) / 2 - 8,
    ),
  ]);
  for (const horizontal of ["left", "right"]) {
    for (const vertical of ["top", "bottom"]) {
      const x =
        hallway[horizontal] - (horizontal === "left" ? 4 : 13) * plantScale;
      const y = hallway[vertical] - (vertical === "top" ? 40 : 48) * plantScale;
      // Plants share the player's parent so their z-order can place foliage in front.
      k.add([
        k.sprite("hallway-plant"),
        k.scale(scaleFactor * plantScale),
        k.pos(map.pos.x + x * scaleFactor, map.pos.y + y * scaleFactor),
        k.z(vertical === "bottom" ? 2 : 0.5),
        // Only the pot is solid, leaving room to walk between the plants.
        k.area({ shape: new k.Rect(k.vec2(4, 40), 9, 8) }),
        k.body({ isStatic: true }),
      ]);
    }
  }

  const hallwayCenter = (hallway.left + hallway.right) / 2;
  for (const furniture of [
    {
      sprite: "hallway-shelf",
      x: hallwayCenter - 12,
      y: hallway.top - 24,
      scale: 1,
      z: 0,
      base: { x: 2, y: 24, width: 20, height: 8 },
    },
    {
      sprite: "hallway-bench",
      x: hallwayCenter - 12,
      y: hallway.bottom - 12,
      scale: 0.75,
      z: 2,
      base: { x: 1, y: 8, width: 30, height: 8 },
    },
  ]) {
    const base = furniture.base;
    k.add([
      k.sprite(furniture.sprite),
      k.pos(
        map.pos.x + furniture.x * scaleFactor,
        map.pos.y + furniture.y * scaleFactor,
      ),
      k.scale(scaleFactor * furniture.scale),
      k.z(furniture.z),
      k.area({
        shape: new k.Rect(k.vec2(base.x, base.y), base.width, base.height),
      }),
      k.body({ isStatic: true }),
    ]);
  }

  const player = k.make([
    k.sprite("adventure-sprites", {
      anim: "idle-down",
    }),
    k.shader("dark-brown-hair", () => {
      const frame = characterSpriteData.frames[0];
      return { u_texel: k.vec2(frame.w / 16, frame.h / 16) };
    }),
    k.area({
      shape: new k.Rect(k.vec2(0, 3), 10, 10),
    }),
    k.body(),
    k.anchor("center"),
    k.pos(),
    k.scale(scaleFactor),
    k.z(1),
    {
      speed: 250,
      direction: "down",
      isInDialogue: false,
    },
    "player",
  ]);

  for (const layer of layers) {
    if (layer.name == "boundaries") {
      for (const boundary of layer.objects) {
        map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
          }),
          k.body({ isStatic: true }), // basically makes sure that the player will not be able to pass over it / overlap
          k.pos(boundary.x, boundary.y),
          boundary.name,
        ]);


      }
      continue;
    }

    if (layer.name === "spawnpoints") {
      for (const entity of layer.objects) {
        if (entity.name === "player") {
          player.pos = k.vec2(
            (map.pos.x + entity.x) * scaleFactor,
            (map.pos.y + entity.y) * scaleFactor,
          );
          k.add(player);
          continue;
        }
      }
    }
  }

  const helpButton = document.getElementById("help-button");
  function openGameDialogue(content) {
    if (player.isInDialogue) return;
    player.isInDialogue = true;
    touchControls.setDisabled(true);
    player.play(`idle-${player.direction === "left" || player.direction === "right" ? "side" : player.direction}`);
    helpButton.disabled = true;
    displayDialogue(content, () => {
      player.isInDialogue = false;
      touchControls.setDisabled(false);
      helpButton.disabled = false;
    });
  }

  function openFurnitureDialogue(tag) {
    openGameDialogue(dialogueData[tag]);
  }
  function showHelp() {
    const isTouch = window.matchMedia("(any-pointer: coarse)").matches;
    openGameDialogue(isTouch
      ? "Tap and hold the D-pad to move."
      : "Use the arrow keys or click a destination to move. Press Escape to close dialogs.");
  }
  helpButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  helpButton.addEventListener("click", (event) => {
    event.stopPropagation();
    showHelp();
  });
  // Storage can be unavailable in private browsing; help remains accessible.
  try {
    if (!window.matchMedia("(any-pointer: coarse)").matches && !localStorage.getItem("portfolio-help-seen")) {
      showHelp();
      localStorage.setItem("portfolio-help-seen", "true");
    }
  } catch {
    if (!window.matchMedia("(any-pointer: coarse)").matches) showHelp();
  }

  for (const tag of Object.keys(dialogueData)) {
    if (approachZones.some((zone) => zone.tag === tag)) continue;
    player.onCollide(tag, () => openFurnitureDialogue(tag));
  }

  setCamScale(k);

  k.onResize(() => {
    setCamScale(k);
  });

  let touchWasMoving = false;
  k.onUpdate(() => {
    const directions = touchControls.directions();
    if (!player.isInDialogue && directions.size) {
      const x = Number(directions.has("right")) - Number(directions.has("left"));
      const y = Number(directions.has("down")) - Number(directions.has("up"));
      if (x || y) {
        const length = Math.hypot(x, y);
        player.move(x / length * player.speed, y / length * player.speed);
        const direction = x ? (x < 0 ? "left" : "right") : (y < 0 ? "up" : "down");
        const anim = x ? "walk-side" : `walk-${direction}`;
        if (player.curAnim() !== anim) player.play(anim);
        if (x) player.flipX = x < 0;
        player.direction = direction;
      }
    } else if (touchWasMoving && !["left", "right", "up", "down"].some((key) => k.isKeyDown(key))) {
      player.play(`idle-${["left", "right"].includes(player.direction) ? "side" : player.direction}`);
    }
    touchWasMoving = directions.size > 0;
    const cameraOffset = Math.max(0, Math.min(30, k.height() / (2 * k.camScale().y) - 64));
    k.camPos(player.pos.x, player.pos.y + cameraOffset);
    const playerFeetY = player.pos.y + 5 * scaleFactor;
    const tvBaseY = livingRoomTv.pos.y + 28 * livingRoomTvScale * scaleFactor;
    livingRoomTv.z = playerFeetY >= tvBaseY ? 0.5 : 2;
    const playerX = (player.pos.x - map.pos.x) / scaleFactor;
    const playerY = (player.pos.y - map.pos.y) / scaleFactor;
    const nextApproaches = new Set();
    for (const zone of approachZones) {
      if (Math.abs(playerX - zone.x) > zone.halfWidth ||
          playerY < zone.top || playerY > zone.bottom) continue;
      nextApproaches.add(zone.tag);
      if (!activeApproaches.has(zone.tag)) openFurnitureDialogue(zone.tag);
    }
    activeApproaches = nextApproaches;
  });

  k.onMouseDown((mouseBtn) => {
    if (window.matchMedia("(any-pointer: coarse)").matches) return;
    if (mouseBtn !== "left" || player.isInDialogue || touchControls.directions().size) return;
    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);
    const lowerBound = 50;
    const upperBound = 125;
    if (
      mouseAngle > lowerBound &&
      mouseAngle < upperBound &&
      player.curAnim() !== "walk-up"
    ) {
      player.play("walk-up");
      player.direction = "up";
      return;
    }
    if (
      mouseAngle < -lowerBound &&
      mouseAngle > -upperBound &&
      player.curAnim() !== "walk-down"
    ) {
      player.play("walk-down");
      player.direction = "down";
      return;
    }

    if (Math.abs(mouseAngle) > upperBound) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
    }

    if (Math.abs(mouseAngle) < lowerBound) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      return;
    }
  });

  k.onMouseRelease(() => {
    if (player.direction === "down") {
      player.play("idle-down");
      return;
    }

    if (player.direction == "up") {
      player.play("idle-up");
      return;
    }

    player.play("idle-side");
  });

  // Keyboard controls
  k.onKeyDown("left", () => {
    if (player.isInDialogue) return;
    player.move(-player.speed, 0);
    if (player.curAnim() !== "walk-side" || player.direction !== "left") {
      player.play("walk-side");
      player.flipX = true;
      player.direction = "left";
    }
  });

  k.onKeyDown("right", () => {
    if (player.isInDialogue) return;
    player.move(player.speed, 0);
    if (player.curAnim() !== "walk-side" || player.direction !== "right") {
      player.play("walk-side");
      player.flipX = false;
      player.direction = "right";
    }
  });

  k.onKeyDown("up", () => {
    if (player.isInDialogue) return;
    player.move(0, -player.speed);
    if (player.curAnim() !== "walk-up") {
      player.play("walk-up");
      player.direction = "up";
    }
  });

  k.onKeyDown("down", () => {
    if (player.isInDialogue) return;
    player.move(0, player.speed);
    if (player.curAnim() !== "walk-down") {
      player.play("walk-down");
      player.direction = "down";
    }
  });

  k.onKeyRelease((key) => {
    const arrowKeys = ["left", "right", "up", "down"];
    if (
      !arrowKeys.includes(key) ||
      arrowKeys.some((arrow) => k.isKeyDown(arrow))
    ) {
      return;
    }
    if (player.direction === "left" || player.direction === "right") {
      player.play("idle-side");
    } else if (player.direction === "up") {
      player.play("idle-up");
    } else if (player.direction === "down") {
      player.play("idle-down");
    }
  });
});

k.go("main"); // goes to the main scene
