function debounce(func, wait, immediate) {
  var timeout;
  return function() {
      var context = this,
          args = arguments;
      var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
  };
};


///////////////////////////////
// Data loading stuff
///////////////////////////////

let data = [];

let thissector = [];

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function isInCurrentSector(obj) {
  let size = 10;
  return obj.type == 'OBJECT'
         && obj.x < size && obj.x > -size
         && obj.y < size && obj.y > -size
         && obj.z < size && obj.z > -size;
}

function getObjectsForSector(a, b, c) {
  let size = 10;
  res = [];
  for (let i = 0; i < data.length; i++) {
    let obj = data[i];
    if (obj.type == 'OBJECT'
      && obj.x < a * size + size && obj.x > a * size - size
      && obj.y < b * size + size && obj.y > b * size - size
      && obj.z < c * size + size && obj.z > c * size - size) {
      res.push(obj);
    }
  }
  console.log('sector (' + a + ','+ b + ','+ c + ') has ' + res.length + ' objects')
  return res;
}

// create a web worker that streams the chart data
const streamingLoaderWorker = new Worker("scripts/streaming-tsv-parser.js");
streamingLoaderWorker.onmessage = ({
  data: { items, totalBytes, finished }
}) => {
  const rows = items
    .map(d => ({
      ...d,
      x: Number(d.x_3d),
      y: Number(d.y_3d),
      z: Number(d.z_3d),
    }))
    .filter(d => d.label);
  data = data.concat(rows);
  if (finished) {
    // thissector.push(...data.filter(isInCurrentSector));
    thissector.push(...getObjectsForSector(0,0,0));

    document.querySelector(".loading-indicator").innerHTML = "Click to explore";
    document.querySelector(".loading-indicator").classList.add("hide");

    console.log('just added objects in this sector: ' + thissector.length);
    startThree();
  }
};

//streamingLoaderWorker.postMessage('../data/tabular_data_both.tsv');
streamingLoaderWorker.postMessage('../data/tabular_data_sciencemuseum.tsv');
// streamingLoaderWorker.postMessage('../data/tabular_data_vam_ac_uk.tsv');

function startThree() {

  ///////////////////////////////
  // Three.js stuff
  ///////////////////////////////
  let needRender = true;

  const scene = new THREE.Scene();
  window.scene = scene;

  const clock = new THREE.Clock();

  const renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: false,
    stencil: false,
    depth: false
  });
  renderer.setSize(window.innerWidth, (window.innerHeight / 2));
  renderer.setClearColor(0xffffff, 0);
  renderer.domElement.id = "wormhole";

  const rendererContainer = document.querySelector('.renderer');
  rendererContainer.appendChild(renderer.domElement);
  const reticleElement = document.querySelector('.reticle');

  const camera = new THREE.PerspectiveCamera(
    100,
    window.innerWidth / (window.innerHeight / 2),
    10,
    10000
  );
  camera.position.x = 0;
  camera.position.y = 10;
  camera.position.z = 0;
  camera.lookAt(0, 0, 0);

  const controls = new THREE.FlyControls(camera, rendererContainer);

  controls.domElement = rendererContainer;
  controls.movementSpeed = 0;
  controls.rollSpeed = 0;
  controls.autoForward = false;
  controls.dragToLook = false;

  // const velocity = new THREE.Vector3();
  // const direction = new THREE.Vector3();

  const starTexture = new THREE.TextureLoader().load("../images/star.png");
  const starShineTexture = new THREE.TextureLoader().load(
    "../images/star-shine.png"
  );

  var SCALE = 8;

  // Multiplier to use between heritage connector coordinates and those used by three.js
  var HCSCALE = 100;

  var CursorSize = 1

  let effectPass;
  // let moveForward = false;
  // let moveBackward = false;
  // let moveLeft = false;
  // let moveRight = false;
  let prevTimePerf = performance.now();

  function getStarsGeometry(max) {
    const geometry = new THREE.BufferGeometry(); // geometry representation, we gonna fill it with coordinates

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(getVerticesForSector(), 3)
    );

    return geometry;
  }

  let isFreeLookEnabled = false;

  function setIsFreeLookEnabled(isEnabled) {
    isFreeLookEnabled = isEnabled

    if (isFreeLookEnabled) {
      controls.movementSpeed = 100;
      controls.rollSpeed = Math.PI / 12;
    } else {
      controls.movementSpeed = 0;
      controls.rollSpeed = 0;
    }
  }

  // original function
  function getVerticesInRandomPosition(max = 200000) {
    const vertices = [];

    for (let i = 0; i < max; i++) {
      const x = 2000 * Math.random() - 1000; // between -1000 / 1000
      const y = 2000 * Math.random() - 1000; // between -1000 / 1000
      const z = 2000 * Math.random() - 1000; // between -1000 / 1000

      vertices.push(x, y, z);
    }

    return vertices;
  }

  function getVerticesForSector() {
    const vertices = [];

    for (let i = 0; i < thissector.length; i++) {
      const x = HCSCALE * thissector[i].x;
      const y = HCSCALE * thissector[i].y;
      const z = HCSCALE * thissector[i].z;

      vertices.push(x, y, z);
    }

    return vertices;
  }

  function getStarsMaterial(texture, opacity = 1, size = 5) {
    return new THREE.PointsMaterial({
      size: size,
      sizeAttenuation: true,
      map: texture,
      //alphaTest: 0.001,
      depthWrite: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: opacity
    });
  }

  const stars = new THREE.Points(
    getStarsGeometry(),
    getStarsMaterial(starShineTexture, 1)
  );

  scene.add(stars);

  // scene.add(controls.getObject());

  const onKeyDown = (event) => {
    switch (event.code) {
      // case "ArrowUp":
      // case "KeyW":
      //   moveForward = true;
      //   break;
      // case "ArrowLeft":
      // case "KeyA":
      //   moveLeft = true;
      //   break;
      // case "ArrowDown":
      // case "KeyS":
      //   moveBackward = true;
      //   break;
      // case "ArrowRight":
      // case "KeyD":
      //   moveRight = true;
      //   break;
      case "Escape":
        setIsFreeLookEnabled(false);
      case "KeyB":
        pushToBookmarks(activeObject)
        break;
      case "KeyH":
        console.log('hyperspace');
        hyperspace();
        break;
    }
  };

  // const onKeyUp = (event) => {
  //   switch (event.code) {
  //     case "ArrowUp":
  //     case "KeyW":
  //       moveForward = false;
  //       break;
  //     case "ArrowLeft":
  //     case "KeyA":
  //       moveLeft = false;
  //       break;
  //     case "ArrowDown":
  //     case "KeyS":
  //       moveBackward = false;
  //       break;
  //     case "ArrowRight":
  //     case "KeyD":
  //       moveRight = false;
  //       break;
  //     case "KeyB":
  //       pushToBookmarks(activeObject)
  //       break;
  //   }
  // };

  document.addEventListener("keydown", onKeyDown);
  // document.addEventListener("keyup", onKeyUp);
  // document.addEventListener("click", () => controls.lock());

  const bloomEffect = new POSTPROCESSING.BloomEffect({
    blendFunction: POSTPROCESSING.BlendFunction.SCREEN,
    kernelSize: POSTPROCESSING.KernelSize.SMALL
  });
  bloomEffect.blendMode.opacity.value = 2;
  //bloomEffect.luminanceMaterial.threshold = 1;
  //bloomEffect.blendMode.exposure.value = 20;

  const godRaysEffectOptions = {
    height: 480,
    blendFunction: POSTPROCESSING.BlendFunction.SCREEN,
    color: 0x000000,
    kernelSize: POSTPROCESSING.KernelSize.SMALL,
    density: 1,
    decay: 0.1,
    weight: 1,
    exposure: 0.1,
    samples: 60,
    clampMax: 1.0
  };
  // TODO - Add on postprocessing to make the speed zoom effect
  const godRaysEffect = new POSTPROCESSING.GodRaysEffect(
    camera,
    stars,
    godRaysEffectOptions
  );

  // using a global variable because effects will be highly animated during the experience
  effectPass = new POSTPROCESSING.EffectPass(camera, bloomEffect);
  effectPass.renderToScreen = true;

  const composer = new POSTPROCESSING.EffectComposer(renderer);
  composer.addPass(new POSTPROCESSING.RenderPass(scene, camera));
  composer.addPass(effectPass);

  function animate(time) {
    if (needRender) {
      composer.render();
    }

    const timePerf = performance.now();
    // if (controls.isLocked === true) {
      // const delta = (timePerf - prevTimePerf) / 1000;
      const delta = clock.getDelta();

      // direction.z = Number(moveForward) - Number(moveBackward);
      // direction.x = Number(moveRight) - Number(moveLeft);

      // if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
      // if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

      // controls.moveRight(-velocity.x * delta);
      // controls.moveForward(-velocity.z * delta);

      controls.update(1 * delta);

    // }
    // else {
    //   camera.position.y -= 0.05;
    //   rotateUniverse();
    // }
    prevTimePerf = time;

    // let current = Math.random();

    // if (current > 0.6 && current < 0.65) stars.material.opacity = current;

    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight / 2);
    camera.aspect = window.innerWidth / ( window.innerHeight / 2);
    composer.setSize(window.innerWidth, ( window.innerHeight / 2));
    camera.updateProjectionMatrix();
  });

  rendererContainer.addEventListener('click', () => {
    setIsFreeLookEnabled(true);
  })

  function rotateUniverse(force = 0.0003) {
    stars.rotation.y += force;
  }

  let activeObject = null;
  var selectedObject = null;

  function onDocumentMouseMove( event ) {
    event.preventDefault();
    if (selectedObject) {
      selectedObject = null;
      reticleElement.style.borderColor = '#ff0000'
    }

    var intersects = getIntersects( event.layerX, event.layerY );
    if (intersects.length > 0) {
      var res = intersects.filter(function(res) {
        return res && res.object;
      })[0];

      // If this is a new object selected
      if (thissector[res.index].id !== activeObject?.id) {
        // From the V&A
        if (thissector[res.index].id.includes('collections.vam.ac.uk')) {
          getVAndAObject(thissector[res.index].id)
        }
        if (thissector[res.index].id.includes('collection.sciencemuseumgroup.org.uk')) {
          getScienceMuseumObject(thissector[res.index].id)
        }
      }

      activeObject = thissector[res.index]

      if (res && res.object) {
        reticleElement.style.borderColor = '#00aa00';
        selectedObject = res.object;
      }
    }
  }

  var raycaster = new THREE.Raycaster();

  function getIntersects( x, y ) {
    // This should use the centre of the viewport
    raycaster.setFromCamera( new THREE.Vector2(), camera );

    return raycaster.intersectObject( stars, true );
  }

  // TODO Don't debounce this event listener. Make it so that
  // you have to hover over the same star for n frames before the selected
  // object changes
  const debouncedOnDocumentMouseMove = debounce(onDocumentMouseMove, 200);

  window.addEventListener( "mousemove", debouncedOnDocumentMouseMove, false );

  function hyperspace() {
    let a =  parseInt(Math.random() * 4);
    let b =  parseInt(Math.random() * 4);
    let c =  parseInt(Math.random() * 4);
    thissector = getObjectsForSector(a,b,c);
    const stars = new THREE.Points(
      getStarsGeometry(),
      getStarsMaterial(starShineTexture, 1)
    );

    scene.add(stars);

  }

  animate();
}
