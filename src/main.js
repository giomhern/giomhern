import { scaleFactor, dialogueData } from "./constants";
import { k } from "./kaboomCtx";
import { displayDialogue, setCamScale } from "./utils";

k.loadSprite("spritesheet", "./spritesheet.png", {
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

k.loadSprite("map", "./map.png");
k.setBackground(k.Color.fromHex("#311047"));

k.scene("main", async () => {
  // async function to load the map
  const mapData = await (await fetch("./map.json")).json();
  const layers = mapData.layers;

  const map = k.add([
    k.sprite("map"),
    // position of game object when displayed
    k.pos(0),
    k.scale(scaleFactor),
  ]);

  const player = k.make([
    k.sprite("spritesheet", {
      anim: "idle-down",
    }),
    k.area({
      shape: new k.Rect(k.vec2(0, 3), 10, 10),
    }),
    k.body(),
    k.anchor("center"),
    k.pos(),
    k.scale(scaleFactor),
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

        if (boundary.name) {
          // want to check collision with this boundary
          player.onCollide(boundary.name, () => {
            player.isInDialogue = true;
            displayDialogue(dialogueData[boundary.name], () => {
              player.isInDialogue = false;
            });
          });
        }
      }
      continue;
    }

    if (layer.name === "spawnpoints") {
      for (const entity of layer.objects) {
        if (entity.name === "player") {
          player.pos = k.vec2(
            (map.pos.x + entity.x) * scaleFactor,
            (map.pos.y + entity.y) * scaleFactor
          );
          k.add(player);
          continue;
        }
      }
    }
  }

  setCamScale(k);

  k.onResize(() => {
    setCamScale(k);
  });

  k.onUpdate(() => {
    k.camPos(player.pos.x, player.pos.y + 100);
  });

  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;
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
  k.keyDown("left", () => {
    player.move(-player.speed, 0);
    if (player.curAnim() !== "walk-side" || player.direction !== "left") {
      player.play("walk-side");
      player.flipX = true;
      player.direction = "left";
    }
  });

  k.keyDown("right", () => {
    player.move(player.speed, 0);
    if (player.curAnim() !== "walk-side" || player.direction !== "right") {
      player.play("walk-side");
      player.flipX = false;
      player.direction = "right";
    }
  });

  k.keyDown("up", () => {
    player.move(0, -player.speed);
    if (player.curAnim() !== "walk-up") {
      player.play("walk-up");
      player.direction = "up";
    }
  });

  k.keyDown("down", () => {
    player.move(0, player.speed);
    if (player.curAnim() !== "walk-down") {
      player.play("walk-down");
      player.direction = "down";
    }
  });

  k.keyRelease(["left", "right", "up", "down"], () => {
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
