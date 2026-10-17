import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
const context = canvas?.getContext("2d");

function render() {

  if (!canvas || !context) {
    throw new Error("Canvas 2D context is unavailable");
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#ff0000";
  context.fillRect(20, 20, 40, 40);

  requestAnimationFrame(render);
}

render();