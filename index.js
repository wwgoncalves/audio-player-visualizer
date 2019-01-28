window.onload = function() {
  const documentTitle = "[Audio Player and Visualizer]";
  document.title = documentTitle;

  const audioElement = document.getElementById("audio");
  audioElement.crossOrigin = "anonymous";

  const canvasElement = document.getElementById("canvas");
  canvasElement.style.display = "none";
  canvasElement.width = window.innerWidth;
  canvasElement.height = window.innerHeight;
  const canvasContext = canvasElement.getContext("2d");

  const dropZoneElement = document.getElementById("dropzone");

  const buttonWrapperElement = document.getElementById("buttonwrapper");
  const visualChangerButtonElement = document.getElementById("visualchanger");
  let frequencyDataDrawingFunctions = [
    drawFrequencyDataAsArcs,
    drawFrequencyDataAsStrokes,
    drawFrequencyDataAsBarGraph
  ];
  let currentFrequencyDataDrawingFunctionIndex = 0;

  let arcRotationReference = 1;
  let arcReferenceToBeRotated = true; // Rotates the arc animation
  let rotatingArcReferece = false;

  let fileList;
  let currentFileIndex = 0;

  let audioContext;
  let audioSourceNode;
  let audioAnalyser;
  const analyserFFTSize = 1024; // "Default" would be 256
  const maxFrequencyValue = 255;

  let audioBufferLength;
  let currentAudioFrequencyDataArray;
  const ratioOfFrequenciesToDraw = 4 / 6; // Reducing the number of frequencies to draw

  dropZoneElement.ondrop = function(event) {
    event.preventDefault();

    fileList = event.dataTransfer.files;
    dropZoneElement.style.display = "none";
    canvasElement.style.display = "block";
    buttonWrapperElement.style.display = "block";
    audioElement.controls = "controls";

    retrieveSetPlayAndRender();
  };

  dropZoneElement.ondragover = function(event) {
    event.preventDefault();
  };

  audioElement.onended = function() {
    setTimeout(function() {
      if (fileList.length === currentFileIndex + 1) {
        location.reload();
      } else {
        // Next track
        ++currentFileIndex;
        retrieveSetPlayAndRender();
      }
    }, 500);
  };

  canvasElement.onclick = function() {
    audioElement && audioElement.paused && !audioElement.ended
      ? audioElement.play()
      : audioElement.pause();
  };

  visualChangerButtonElement.onclick = function() {
    if (
      currentFrequencyDataDrawingFunctionIndex <
      frequencyDataDrawingFunctions.length - 1
    ) {
      ++currentFrequencyDataDrawingFunctionIndex;
    } else {
      currentFrequencyDataDrawingFunctionIndex = 0;
    }
  };

  function drawCanvasBackground() {
    canvasContext.fillStyle = "#212";
    canvasContext.fillRect(0, 0, canvasElement.width, canvasElement.height);
  }

  function drawFrequencyDataAsBarGraph() {
    // Modified from Nick Jones - https://codepen.io/nfj525/
    const barWidth = canvasElement.width / audioBufferLength;
    let barHeight;
    let x = 0;
    for (let i = 0; i < audioBufferLength; i++) {
      barHeight = currentAudioFrequencyDataArray[i];

      let r = barHeight + audioBufferLength / (i + 1);
      let g = 200 * (i / audioBufferLength);
      let b = 10 * (i / audioBufferLength) + 50;

      canvasContext.fillStyle = `rgb(${r},${g},${b})`;
      canvasContext.fillRect(
        x,
        canvasElement.height -
          (barHeight * canvasElement.height) / maxFrequencyValue,
        barWidth,
        (barHeight * canvasElement.height) / maxFrequencyValue
      );

      x += barWidth;
    }
  }

  function drawFrequencyDataAsStrokes() {
    const strokeWidth = canvasElement.width / audioBufferLength;
    let strokeHeight;
    let x = 0;
    let y = 0;
    let _x = 0;

    for (let i = 0; i < audioBufferLength; i++) {
      strokeHeight = currentAudioFrequencyDataArray[i];

      let redValue = strokeHeight + audioBufferLength / (i + 1);
      let greenValue = 200 * (i / audioBufferLength);
      let blueValue = 10 * (i / audioBufferLength) + 50;

      x = _x + strokeWidth;
      y =
        canvasElement.height -
        (strokeHeight * canvasElement.height) / maxFrequencyValue;

      canvasContext.beginPath();
      canvasContext.lineWidth = 5;
      canvasContext.moveTo(_x, y);
      canvasContext.lineTo(x, y);
      canvasContext.strokeStyle = `rgb(${redValue},${greenValue},${blueValue})`;
      canvasContext.stroke();
      canvasContext.closePath();

      _x = x;
    }
  }

  function drawFrequencyDataAsArcs() {
    const arcWidth = (2 * Math.PI) / audioBufferLength;
    const innerAndOuterArcsCenterX = Math.floor(canvasElement.width / 2);
    const innerAndOuterArcsCenterY = Math.floor(canvasElement.height / 2);
    const innerArcRadius = 0;
    const outerArcRadius = Math.floor(
      Math.min(canvasElement.width, canvasElement.height) / 2
    );
    let arcHeight;

    for (let i = 0; i < audioBufferLength; i++) {
      arcHeight = currentAudioFrequencyDataArray[i];

      let redValue = arcHeight + audioBufferLength / (i + 1);
      let greenValue = 200 * (i / audioBufferLength);
      let blueValue = 10 * (i / audioBufferLength) + 50;

      canvasContext.beginPath();
      canvasContext.arc(
        innerAndOuterArcsCenterX,
        innerAndOuterArcsCenterY,
        innerArcRadius,
        (arcRotationReference + i) * arcWidth,
        (arcRotationReference + i + 1) * arcWidth
      );
      canvasContext.arc(
        innerAndOuterArcsCenterX,
        innerAndOuterArcsCenterY,
        Math.floor((arcHeight / maxFrequencyValue) * outerArcRadius),
        (arcRotationReference + i) * arcWidth,
        (arcRotationReference + i + 1) * arcWidth
      );
      canvasContext.arc(
        innerAndOuterArcsCenterX,
        innerAndOuterArcsCenterY,
        innerArcRadius,
        (arcRotationReference + i) * arcWidth,
        (arcRotationReference + i + 1) * arcWidth
      );
      canvasContext.fillStyle = `rgb(${redValue},${greenValue},${blueValue})`;
      canvasContext.strokeStyle = `rgb(${redValue},${greenValue},${blueValue})`;
      canvasContext.lineWidth = 1;
      canvasContext.stroke();
      //canvasContext.fill();
      canvasContext.closePath();
    }

    if (arcReferenceToBeRotated && !rotatingArcReferece) {
      rotatingArcReferece = true;
      setInterval(rotateArcReference, 50);
    }
  }

  function rotateArcReference() {
    if (arcRotationReference === audioBufferLength) {
      arcRotationReference = 1;
    } else {
      ++arcRotationReference;
    }
  }

  function showAudioFileName() {
    canvasContext.font = '1.3em "Courier New", monospace';
    canvasContext.fillStyle = "#ffc";
    canvasContext.fillText(audioElement.fileName, 10, 40);
  }

  function renderFrame() {
    audioAnalyser.getByteFrequencyData(currentAudioFrequencyDataArray);

    drawCanvasBackground();
    frequencyDataDrawingFunctions[currentFrequencyDataDrawingFunctionIndex]();
    showAudioFileName();

    window.requestAnimationFrame(renderFrame);
  }

  function retrieveSetPlayAndRender() {
    audioElement.src = URL.createObjectURL(fileList[currentFileIndex]);
    audioElement.fileName = fileList[currentFileIndex].name;
    audioElement.load();
    document.title = `${documentTitle} - ${audioElement.fileName}`;

    if (!audioContext) {
      audioContext = new AudioContext();
      audioSourceNode = audioContext.createMediaElementSource(audioElement);
      audioAnalyser = audioContext.createAnalyser();
      audioSourceNode.connect(audioAnalyser);
      audioAnalyser.connect(audioContext.destination);
      audioAnalyser.fftSize = analyserFFTSize;
    }
    audioBufferLength = audioAnalyser.frequencyBinCount;
    audioBufferLength = Math.floor(
      audioBufferLength * ratioOfFrequenciesToDraw
    );
    currentAudioFrequencyDataArray = new Uint8Array(audioBufferLength);

    audioElement.play();

    renderFrame();
  }
};
