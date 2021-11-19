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
  return obj.x < size && obj.x > -size
         && obj.y < size && obj.y > -size
         && obj.z < size && obj.z > -size;
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
    thissector.push(...data.filter(isInCurrentSector));

    document.getElementById("loadingIndicator").innerHTML = "<a class=\"button\" onclick=\"closeLoadingPane()\">Explore</a>";

    console.log('just added objects in this sector: ' + thissector.length);
    startThree();

  }
};

streamingLoaderWorker.postMessage('../data/tabular_data_sciencemuseum.tsv');
//streamingLoaderWorker.postMessage('../data/tabular_data_vam_ac_uk.tsv');

function startThree() {

  ///////////////////////////////
  // Three.js stuff
  ///////////////////////////////
  let needRender = true;

  const scene = new THREE.Scene();
  window.scene = scene;

  const renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: false,
    stencil: false,
    depth: false
  });
  renderer.setSize(window.innerWidth, (window.innerHeight / 2));
  renderer.setClearColor(0xffffff, 0);
  renderer.domElement.id = "wormhole";

  const rendererContainer = document.querySelector('.renderer')
  rendererContainer.appendChild(renderer.domElement);

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

  const controls = new THREE.PointerLockControls(camera, rendererContainer);
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3();

  const starTexture = new THREE.TextureLoader().load("../images/star.png");
  const starShineTexture = new THREE.TextureLoader().load(
    "../images/star-shine.png"
  );

  var SCALE = 8;

  // Multiplier to use between heritage connector coordinates and those used by three.js
  var HCSCALE = 100;

  var CursorSize = 1

  let effectPass;
  let moveForward = false;
  let moveBackward = false;
  let moveLeft = false;
  let moveRight = false;
  let prevTimePerf = performance.now();

  function getStarsGeometry(max) {
    const geometry = new THREE.BufferGeometry(); // geometry representation, we gonna fill it with coordinates

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(getVerticesForSector(), 3)
    );

    return geometry;
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

  const brightStars = new THREE.Points(
    getStarsGeometry(),
    getStarsMaterial(starShineTexture, 1)
  );

  scene.add(brightStars);

  scene.add(controls.getObject());

  var reticle = new THREE.Mesh(
    new THREE.RingBufferGeometry( 0.5 * CursorSize, CursorSize, 32),
    new THREE.MeshBasicMaterial( {color: 0xff0000, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
  );
  reticle.position.z = -1.5 * SCALE;
  reticle.lookAt(camera.position)
  camera.add(reticle);

  const onKeyDown = (event) => {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = true;
        break;
      case "ArrowLeft":
      case "KeyA":
        moveLeft = true;
        break;
      case "ArrowDown":
      case "KeyS":
        moveBackward = true;
        break;
      case "ArrowRight":
      case "KeyD":
        moveRight = true;
        break;
    }
  };

  const onKeyUp = (event) => {
    switch (event.code) {
      case "ArrowUp":
      case "KeyW":
        moveForward = false;
        break;
      case "ArrowLeft":
      case "KeyA":
        moveLeft = false;
        break;
      case "ArrowDown":
      case "KeyS":
        moveBackward = false;
        break;
      case "ArrowRight":
      case "KeyD":
        moveRight = false;
        break;
    }
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("click", () => controls.lock());

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
    brightStars,
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
    if (controls.isLocked === true) {
      const delta = (timePerf - prevTimePerf) / 1000;

      direction.z = Number(moveForward) - Number(moveBackward);
      direction.x = Number(moveRight) - Number(moveLeft);

      if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
      if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);
    }
    prevTimePerf = time;

    camera.position.y -= 0.05;

    // let current = Math.random();

    // if (current > 0.6 && current < 0.65) mediumStars.material.opacity = current;

    rotateUniverse();

    requestAnimationFrame(animate);
  }

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight / 2);
    camera.aspect = window.innerWidth / ( window.innerHeight / 2);
    composer.setSize(window.innerWidth, ( window.innerHeight / 2));
    camera.updateProjectionMatrix();
  });

  function rotateUniverse(force = 0.0003) {
    brightStars.rotation.y += force;
    // mediumStars.rotation.y += force;
    // paleStars.rotation.y += force;
  }

  window.addEventListener( "mousemove", onDocumentMouseMove, false );

  var selectedObject = null;

  function onDocumentMouseMove( event ) {
    event.preventDefault();
    if ( selectedObject ) {
      selectedObject = null;
      reticle.material.color.set(0xff0000)
    }

    var intersects = getIntersects( event.layerX, event.layerY );
    if ( intersects.length > 0 ) {

      var res = intersects.filter( function ( res ) {

        return res && res.object;

      } )[ 0 ];

      console.log(res)

      if ( res && res.object ) {
        reticle.material.color.set(0x00aa00)
        selectedObject = res.object;
      }
    }
  }

  var raycaster = new THREE.Raycaster();
  // var mouseVector = new THREE.Vector3();

  function getIntersects( x, y ) {

    // x = ( x / window.innerWidth ) * 2 - 1;
    // y = - ( y / window.innerHeight ) * 2 + 1;

    // mouseVector.set( x, y, 0.5 );
    // This should use the centre of the viewport
    raycaster.setFromCamera( new THREE.Vector2(), camera );

    return raycaster.intersectObject( brightStars, true );

  }

  animate();
}
