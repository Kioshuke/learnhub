/* Trình dựng QR dùng chung cho trang tạo đề và Phòng Học. */
(function (global) {
  "use strict";

  function render(canvas, link) {
    if (!canvas) throw new Error("Không tìm thấy canvas QR.");
    if (typeof global.QRCode !== "function") throw new Error("Thư viện QR chưa được tải.");

    var qrSize = 256;
    var padding = 20;
    var radius = 22;
    var frameSize = qrSize + padding * 2;
    var offset = (frameSize - qrSize) / 2;
    canvas.width = frameSize;
    canvas.height = frameSize;

    var host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:-10000px;top:0;width:" + qrSize + "px;height:" + qrSize + "px;overflow:hidden";
    document.body.appendChild(host);

    try {
      new global.QRCode(host, {
        text: String(link || ""),
        width: qrSize,
        height: qrSize,
        correctLevel: global.QRCode.CorrectLevel.M
      });
      var qrCanvas = host.querySelector("canvas");
      if (!qrCanvas) throw new Error("Không tạo được mã QR.");

      var ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Trình duyệt không hỗ trợ canvas.");
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(radius, 2);
      ctx.lineTo(frameSize - radius, 2);
      ctx.quadraticCurveTo(frameSize - 2, 2, frameSize - 2, radius);
      ctx.lineTo(frameSize - 2, frameSize - radius);
      ctx.quadraticCurveTo(frameSize - 2, frameSize - 2, frameSize - radius, frameSize - 2);
      ctx.lineTo(radius, frameSize - 2);
      ctx.quadraticCurveTo(2, frameSize - 2, 2, frameSize - radius);
      ctx.lineTo(2, radius);
      ctx.quadraticCurveTo(2, 2, radius, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qrCanvas, offset, offset, qrSize, qrSize);
      return canvas;
    } finally {
      host.remove();
    }
  }

  global.LearnHubTestQR = { render: render };
})(window);
