
// ============================================
// THREE.JS 3D GALAXY SIMULATION
// ============================================

const container = document.getElementById('threejs-container');
const devicePixelRatio = window.devicePixelRatio || 1;

const width = container.clientWidth || window.innerWidth;
const height = container.clientHeight || window.innerHeight;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
camera.position.z = 4;
camera.position.y = 2;
camera.lookAt(0, 0, 0);

// Add lighting for 3D planets
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(0, 0, 0);
scene.add(pointLight);

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000);
container.appendChild(renderer.domElement);



// Galaxy Parameters
const parameters = {
    count: 100000,
    size: 0.01,
    radius: 8,
    branches: 5,
    spin: 1.5,
    randomness: 0.5,
    randomnessPower: 3,
    insideColor: '#ff6030',
    outsideColor: '#1b3984'
};

let geometry = null;
let material = null;
let points = null;
let starField = null;
let planets = [];
let sun = null;
let blackHole = null;
let blackHoleDisk = null;
let blackHoleHalo = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// View state
let currentView = 0;
let freeCamMode = false;
let isAnimating = false;

// Big Bang intro animation state
let bigBangProgress = 0;
let bigBangPhase = 'black'; // 'black', 'explosion', 'formation', 'complete'
let explosionParticles = null;
let bigBangStartTime = 0;
const views = [
    { z: 4, y: 2, name: 'overview' },           // Overview
    { z: 1.5, y: 0.5, name: 'zoomed-in' },     // Zoomed in
    { z: 4, y: -2, name: 'underneath' }        // Underneath
];

const generateGalaxy = () => {
    if (points !== null) {
        geometry.dispose();
        material.dispose();
        scene.remove(points);
    }

    geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);

    const colorInside = new THREE.Color(parameters.insideColor);
    const colorOutside = new THREE.Color(parameters.outsideColor);

    for (let i = 0; i < parameters.count; i++) {
        const i3 = i * 3;

        // Position
        const radius = Math.random() * parameters.radius;
        const spinAngle = radius * parameters.spin;
        const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;

        const randomX = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomY = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
        const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

        positions[i3 + 0] = Math.cos(branchAngle + spinAngle) * radius + randomX;
        positions[i3 + 1] = randomY;
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

        // Color
        const mixedColor = colorInside.clone();
        mixedColor.lerp(colorOutside, radius / parameters.radius);

        colors[i3 + 0] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    material = new THREE.PointsMaterial({
        size: parameters.size,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        opacity: 1
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
};

const generateStarField = () => {
    if (starField !== null) {
        starField.geometry.dispose();
        starField.material.dispose();
        scene.remove(starField);
    }

    const starGeometry = new THREE.BufferGeometry();
    const starCount = 50000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
        const i3 = i * 3;

        // Random position on a very large sphere surrounding the galaxy
        const radius = 100 + Math.random() * 400;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        starPositions[i3 + 0] = radius * Math.sin(phi) * Math.cos(theta);
        starPositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        starPositions[i3 + 2] = radius * Math.cos(phi);

        // Random star colors (white, blue, yellow, red)
        const colorChoice = Math.random();
        if (colorChoice < 0.7) {
            // White
            starColors[i3 + 0] = 1;
            starColors[i3 + 1] = 1;
            starColors[i3 + 2] = 1;
        } else if (colorChoice < 0.85) {
            // Blue
            starColors[i3 + 0] = 0.7;
            starColors[i3 + 1] = 0.8;
            starColors[i3 + 2] = 1;
        } else if (colorChoice < 0.95) {
            // Yellow
            starColors[i3 + 0] = 1;
            starColors[i3 + 1] = 0.9;
            starColors[i3 + 2] = 0.7;
        } else {
            // Red
            starColors[i3 + 0] = 1;
            starColors[i3 + 1] = 0.6;
            starColors[i3 + 2] = 0.6;
        }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
        size: 0.03,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
};

generateGalaxy();
generateStarField();

const generatePlanets = () => {
    // Remove existing planets
    planets.forEach(planet => {
        scene.remove(planet.mesh);
        planet.mesh.geometry.dispose();
        planet.mesh.material.dispose();
    });
    planets = [];

    // Solar system position in Milky Way (Orion Arm, ~2/3 from center)
    const solarSystemDistance = 5.5; // Scaled distance from galactic center
    const solarSystemAngle = Math.PI * 0.3; // Position in one of the spiral arms

    // Create sun at solar system position
    const sunGeometry = new THREE.SphereGeometry(0.4, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xFFDD00,
        transparent: true,
        opacity: 1
    });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.x = Math.cos(solarSystemAngle) * solarSystemDistance;
    sun.position.z = Math.sin(solarSystemAngle) * solarSystemDistance;
    sun.position.y = 0.3;
    sun.userData = {
        displayName: 'The Sun',
        info: 'Type: G-type main-sequence star\nDiameter: 1,392,700 km\nSurface Temp: 5,500°C\nAge: 4.6 billion years'
    };
    scene.add(sun);

    // Add sun glow layers
    const glowLayers = [
        { radius: 0.5, opacity: 0.4, color: 0xFFAA00 },
        { radius: 0.65, opacity: 0.25, color: 0xFF8800 },
        { radius: 0.85, opacity: 0.15, color: 0xFF6600 },
        { radius: 1.1, opacity: 0.08, color: 0xFF4400 },
    ];

    glowLayers.forEach(layer => {
        const glowGeometry = new THREE.SphereGeometry(layer.radius, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: layer.color, 
            transparent: true, 
            opacity: layer.opacity 
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(sun.position);
        scene.add(glow);
    });

    // Planet data (relative distances from sun)
    const planetData = [
        { 
            name: 'mercury', 
            displayName: 'Mercury',
            info: 'Distance: 57.9M km\nDiameter: 4,879 km\nOrbit: 88 days',
            radius: 0.04, 
            distance: 0.6, 
            speed: 2.0, 
            color: 0x8C7853, 
            roughness: 0.9 
        },
        { 
            name: 'venus', 
            displayName: 'Venus',
            info: 'Distance: 108.2M km\nDiameter: 12,104 km\nOrbit: 225 days',
            radius: 0.06, 
            distance: 0.9, 
            speed: 1.5, 
            color: 0xE6C87A, 
            roughness: 0.8 
        },
        { 
            name: 'earth', 
            displayName: 'Earth',
            info: 'Distance: 149.6M km\nDiameter: 12,742 km\nOrbit: 365 days',
            radius: 0.065, 
            distance: 1.3, 
            speed: 1.0, 
            color: 0x6B93D6, 
            roughness: 0.6 
        },
        { 
            name: 'mars', 
            displayName: 'Mars',
            info: 'Distance: 227.9M km\nDiameter: 6,779 km\nOrbit: 687 days',
            radius: 0.05, 
            distance: 1.8, 
            speed: 0.8, 
            color: 0xC1440E, 
            roughness: 0.85 
        },
        { 
            name: 'jupiter', 
            displayName: 'Jupiter',
            info: 'Distance: 778.5M km\nDiameter: 139,820 km\nOrbit: 12 years',
            radius: 0.18, 
            distance: 3.0, 
            speed: 0.4, 
            color: 0xD4A574, 
            roughness: 0.7 
        },
        { 
            name: 'saturn', 
            displayName: 'Saturn',
            info: 'Distance: 1.4B km\nDiameter: 116,460 km\nOrbit: 29 years',
            radius: 0.15, 
            distance: 4.2, 
            speed: 0.3, 
            color: 0xEAD6B8, 
            roughness: 0.7, 
            hasRings: true 
        },
    ];

    planetData.forEach((data, index) => {
        const geometry = new THREE.SphereGeometry(data.radius, 64, 64);
        
        // Create more realistic material
        const material = new THREE.MeshStandardMaterial({ 
            color: data.color,
            roughness: data.roughness,
            metalness: 0.1,
            transparent: true,
            opacity: 1
        });
        
        const mesh = new THREE.Mesh(geometry, material);

        // Random starting angle around sun
        const angle = Math.random() * Math.PI * 2;
        
        // Position relative to sun
        mesh.position.x = sun.position.x + Math.cos(angle) * data.distance;
        mesh.position.z = sun.position.z + Math.sin(angle) * data.distance;
        mesh.position.y = sun.position.y + (Math.random() - 0.5) * 0.2;

        // Add Saturn's rings
        let ringMesh = null;
        if (data.hasRings) {
            const ringGeometry = new THREE.RingGeometry(data.radius * 1.4, data.radius * 2.2, 64);
            const ringMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xC9B896, 
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.7
            });
            ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            ringMesh.position.copy(mesh.position);
            ringMesh.rotation.x = Math.PI / 2.5;
            scene.add(ringMesh);
        }

        // Add Moon for Earth
        let moonMesh = null;
        if (data.name === 'earth') {
            const moonGeometry = new THREE.SphereGeometry(0.015, 32, 32);
            const moonMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xAAAAAA,
                roughness: 0.9,
                transparent: true,
                opacity: 1
            });
            moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
            const moonAngle = Math.random() * Math.PI * 2;
            moonMesh.position.x = mesh.position.x + Math.cos(moonAngle) * 0.15;
            moonMesh.position.z = mesh.position.z + Math.sin(moonAngle) * 0.15;
            moonMesh.position.y = mesh.position.y;
            scene.add(moonMesh);
        }

        // Random rotation speed
        const rotationSpeed = (Math.random() * 0.01 + 0.005) * (Math.random() < 0.5 ? 1 : -1);

        scene.add(mesh);

        planets.push({
            mesh,
            ringMesh,
            moonMesh,
            displayName: data.displayName,
            info: data.info,
            sunPosition: { x: sun.position.x, z: sun.position.z, y: sun.position.y },
            distance: data.distance,
            speed: data.speed,
            angle,
            verticalOffset: mesh.position.y - sun.position.y,
            rotationSpeed,
            moonAngle: moonMesh ? Math.random() * Math.PI * 2 : null
        });
    });
};

generatePlanets();

// Generate Black Hole
const generateBlackHole = () => {
    // Position black hole very far away
    const blackHolePosition = { x: 200, y: 0, z: -100 };
    
    // Black Hole Core (Event Horizon) - invisible but for hover detection
    const coreGeometry = new THREE.SphereGeometry(2, 64, 64);
    const coreMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 0
    });
    blackHole = new THREE.Mesh(coreGeometry, coreMaterial);
    blackHole.position.set(blackHolePosition.x, blackHolePosition.y, blackHolePosition.z);
    blackHole.userData = {
        displayName: 'Supermassive Black Hole',
        info: 'Type: Supermassive black hole\nMass: 4 million solar masses\nEvent Horizon: 12 million km\nDistance: 26,000 light-years'
    };
    scene.add(blackHole);
    
    // Accretion Disk - Custom Shader
    const diskGeometry = new THREE.RingGeometry(2.4, 14, 256);
    const diskMaterial = new THREE.ShaderMaterial({
        uniforms: {
            u_time: { value: 0 },
            u_color1: { value: new THREE.Color(0xff4400) },
            u_color2: { value: new THREE.Color(0xffcc00) },
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float u_time;
            uniform vec3 u_color1;
            uniform vec3 u_color2;
            varying vec2 vUv;
            varying vec3 vPosition;

            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
            float noise(vec2 p) {
                vec2 i = floor(p); vec2 f = fract(p);
                f = f*f*(3.0-2.0*f);
                return mix(mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), f.x),
                           mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
            }

            void main() {
                float dist = length(vPosition.xy);
                float angle = atan(vPosition.y, vPosition.x);
                
                float n = noise(vec2(dist * 2.0 - u_time * 2.0, angle * 8.0 + u_time));
                float swirl = sin(dist * 1.5 - u_time * 4.0 + angle * 4.0 + n * 2.0);
                
                float glow = exp(-pow(dist - 5.0, 2.0) * 0.4);
                glow += exp(-pow(dist - 3.0, 2.0) * 2.0) * 0.5;
                
                vec3 color = mix(u_color1, u_color2, swirl * 0.5 + 0.5);
                color *= (1.5 + 0.5 * n);
                
                float alpha = glow * (0.7 + 0.3 * swirl);
                alpha *= smoothstep(2.0, 2.6, dist);
                alpha *= smoothstep(14.0, 10.0, dist);

                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });

    blackHoleDisk = new THREE.Mesh(diskGeometry, diskMaterial);
    blackHoleDisk.position.copy(blackHole.position);
    blackHoleDisk.rotation.x = Math.PI / 2.2;
    scene.add(blackHoleDisk);

    // Gravitational Lensing Halo
    const haloGeometry = new THREE.SphereGeometry(2.1, 64, 64);
    const haloMaterial = new THREE.ShaderMaterial({
        uniforms: { u_time: { value: 0 } },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vViewVec;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                vViewVec = normalize(-mvPos.xyz);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vViewVec;
            void main() {
                float intensity = pow(1.0 - dot(vNormal, vViewVec), 4.0);
                gl_FragColor = vec4(1.0, 0.8, 0.4, intensity * 0.9);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending
    });
    blackHoleHalo = new THREE.Mesh(haloGeometry, haloMaterial);
    blackHoleHalo.position.copy(blackHole.position);
    scene.add(blackHoleHalo);
};

generateBlackHole();

// Create explosion particles for Big Bang
const createExplosionParticles = () => {
    const particleCount = 50000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Start at center
        positions[i3] = 0;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = 0;
        
        // Random explosion velocities
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = Math.random() * 8 + 2;
        
        velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed;
        velocities[i3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
        velocities[i3 + 2] = Math.cos(phi) * speed;
        
        // Hot colors (white, yellow, orange, red)
        const colorChoice = Math.random();
        if (colorChoice < 0.3) {
            colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 1; // White
        } else if (colorChoice < 0.6) {
            colors[i3] = 1; colors[i3 + 1] = 0.9; colors[i3 + 2] = 0.5; // Yellow
        } else if (colorChoice < 0.8) {
            colors[i3] = 1; colors[i3 + 1] = 0.5; colors[i3 + 2] = 0.1; // Orange
        } else {
            colors[i3] = 1; colors[i3 + 1] = 0.2; colors[i3 + 2] = 0.1; // Red
        }
        
        sizes[i] = Math.random() * 0.05 + 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
        size: 0.05,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
        opacity: 1
    });

    explosionParticles = new THREE.Points(geometry, material);
    explosionParticles.userData = { velocities, originalColors: colors.slice() };
    scene.add(explosionParticles);
};

// Start Big Bang animation
const startBigBang = () => {
    bigBangStartTime = Date.now();
    bigBangPhase = 'black';
    bigBangProgress = 0;
    
    // Initially hide galaxy
    if (points) points.visible = false;
    if (starField) starField.visible = false;
    if (sun) sun.visible = false;
    planets.forEach(p => {
        p.mesh.visible = false;
        if (p.ringMesh) p.ringMesh.visible = false;
        if (p.moonMesh) p.moonMesh.visible = false;
    });
    
    // Create explosion particles
    createExplosionParticles();
};

// Initialize Big Bang animation on load
startBigBang();

// Animation
const clock = new THREE.Clock();

const animate = () => {
    const elapsedTime = clock.getElapsedTime();
    
    // Big Bang animation sequence
    if (bigBangPhase !== 'complete') {
        const elapsedSinceStart = (Date.now() - bigBangStartTime) / 1000;
        
        // Phase 1: Black screen (0-2 seconds)
        if (elapsedSinceStart < 2) {
            bigBangPhase = 'black';
            renderer.setClearColor(0x000000);
        }
        // Phase 2: Explosion (2-5 seconds)
        else if (elapsedSinceStart < 5) {
            bigBangPhase = 'explosion';
            const explosionProgress = (elapsedSinceStart - 2) / 3;
            
            if (explosionParticles) {
                const positions = explosionParticles.geometry.attributes.position.array;
                const velocities = explosionParticles.userData.velocities;
                const colors = explosionParticles.geometry.attributes.color.array;
                
                for (let i = 0; i < positions.length / 3; i++) {
                    const i3 = i * 3;
                    
                    // Move particles outward
                    positions[i3] += velocities[i3] * 0.02;
                    positions[i3 + 1] += velocities[i3 + 1] * 0.02;
                    positions[i3 + 2] += velocities[i3 + 2] * 0.02;
                    
                    // Cool down colors over time
                    const coolFactor = 1 - explosionProgress * 0.5;
                    colors[i3] *= coolFactor;
                    colors[i3 + 1] *= coolFactor;
                    colors[i3 + 2] *= coolFactor;
                }
                
                explosionParticles.geometry.attributes.position.needsUpdate = true;
                explosionParticles.geometry.attributes.color.needsUpdate = true;
                explosionParticles.material.opacity = 1 - explosionProgress * 0.3;
            }
            
            // Fade to dark background
            const bgBrightness = Math.max(0, 1 - explosionProgress);
            renderer.setClearColor(new THREE.Color(bgBrightness * 0.1, bgBrightness * 0.05, bgBrightness * 0.02));
        }
        // Phase 3: Galaxy formation (5-10 seconds)
        else if (elapsedSinceStart < 10) {
            bigBangPhase = 'formation';
            const formationProgress = (elapsedSinceStart - 5) / 5;
            
            // Fade out explosion particles
            if (explosionParticles) {
                explosionParticles.material.opacity = Math.max(0, 0.7 - formationProgress);
                if (formationProgress > 0.9) {
                    scene.remove(explosionParticles);
                    explosionParticles = null;
                }
            }
            
            // Gradually reveal galaxy
            if (points) {
                points.visible = true;
                points.material.opacity = formationProgress;
                points.material.transparent = true;
            }
            
            if (starField) {
                starField.visible = true;
                starField.material.opacity = formationProgress * 0.8;
                starField.material.transparent = true;
            }
            
            // Reveal sun and planets later in formation
            if (formationProgress > 0.5 && sun) {
                sun.visible = true;
                sun.material.opacity = (formationProgress - 0.5) * 2;
                sun.material.transparent = true;
            }
            
            if (formationProgress > 0.7) {
                planets.forEach((planet, i) => {
                    planet.mesh.visible = true;
                    planet.mesh.material.opacity = Math.min(1, (formationProgress - 0.7) * 3);
                    planet.mesh.material.transparent = true;
                    if (planet.ringMesh) {
                        planet.ringMesh.visible = true;
                        planet.ringMesh.material.opacity = Math.min(1, (formationProgress - 0.7) * 3);
                    }
                    if (planet.moonMesh) {
                        planet.moonMesh.visible = true;
                        planet.moonMesh.material.opacity = Math.min(1, (formationProgress - 0.7) * 3);
                    }
                });
            }
            
            // Slowly start galaxy rotation
            if (points) {
                points.rotation.y = formationProgress * elapsedTime * 0.001;
            }
            
            renderer.setClearColor(0x000000);
        }
        // Phase 4: Complete
        else {
            bigBangPhase = 'complete';
            
            // Ensure full opacity
            if (points) {
                points.material.opacity = 1;
                points.material.transparent = false;
            }
            if (starField) {
                starField.material.opacity = 0.8;
                starField.material.transparent = true;
            }
            if (sun) {
                sun.material.opacity = 1;
                sun.material.transparent = false;
            }
            planets.forEach(planet => {
                planet.mesh.material.opacity = 1;
                planet.mesh.material.transparent = false;
                if (planet.ringMesh) {
                    planet.ringMesh.material.opacity = 0.7;
                }
                if (planet.moonMesh) {
                    planet.moonMesh.material.opacity = 1;
                }
            });
        }
    }
    
    // Normal animation (only when Big Bang is complete)
    if (bigBangPhase === 'complete') {
        // Update free cam movement
        updateFreeCam();
        
        // Rotate Galaxy (very slow - galactic rotation)
        if (points) {
            points.rotation.y = elapsedTime * 0.001;
        }
        
        // Very slowly rotate star field
        if (starField) {
            starField.rotation.y = elapsedTime * 0.0002;
            starField.rotation.x = elapsedTime * 0.00005;
        }
        
        // Animate planets orbiting around the sun (realistic slow speeds)
        planets.forEach(planet => {
            planet.angle += planet.speed * 0.00005;
            
            // Orbit around sun position
            planet.mesh.position.x = planet.sunPosition.x + Math.cos(planet.angle) * planet.distance;
            planet.mesh.position.z = planet.sunPosition.z + Math.sin(planet.angle) * planet.distance;
            planet.mesh.position.y = planet.sunPosition.y + planet.verticalOffset + Math.sin(elapsedTime * planet.speed) * 0.001;
            
            // Rotate planet on its axis (very slow)
            planet.mesh.rotation.y += planet.rotationSpeed * 0.02;
            
            // Move Saturn's rings with the planet
            if (planet.ringMesh) {
                planet.ringMesh.position.copy(planet.mesh.position);
            }
            
            // Animate Moon orbiting Earth (realistic slow speed)
            if (planet.moonMesh) {
                planet.moonAngle += 0.002;
                planet.moonMesh.position.x = planet.mesh.position.x + Math.cos(planet.moonAngle) * 0.15;
                planet.moonMesh.position.z = planet.mesh.position.z + Math.sin(planet.moonAngle) * 0.15;
                planet.moonMesh.position.y = planet.mesh.position.y;
            }
        });

        // Animate Black Hole
        if (blackHoleDisk) {
            blackHoleDisk.material.uniforms.u_time.value = elapsedTime;
            blackHoleDisk.rotation.z += 0.008;
        }
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
};

animate();

// Resize
window.addEventListener('resize', () => {
    const newWidth = container.clientWidth || window.innerWidth;
    const newHeight = container.clientHeight || window.innerHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(newWidth, newHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});





// WASD movement for free cam
const keys = { w: false, a: false, s: false, d: false, space: false, shift: false };
const moveSpeed = 0.05;

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ') {
        keys.space = true;
    } else if (key === 'shift') {
        keys.shift = true;
    } else if (keys.hasOwnProperty(key)) {
        keys[key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === ' ') {
        keys.space = false;
    } else if (key === 'shift') {
        keys.shift = false;
    } else if (keys.hasOwnProperty(key)) {
        keys[key] = false;
    }
});

// Update camera position in animation loop
function updateFreeCam() {
    if (!freeCamMode) return;
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.normalize();
    
    const right = new THREE.Vector3();
    right.crossVectors(direction, camera.up).normalize();
    
    const up = new THREE.Vector3();
    up.crossVectors(right, direction).normalize();
    
    if (keys.w) {
        camera.position.addScaledVector(direction, moveSpeed);
    }
    if (keys.s) {
        camera.position.addScaledVector(direction, -moveSpeed);
    }
    if (keys.a) {
        camera.position.addScaledVector(right, -moveSpeed);
    }
    if (keys.d) {
        camera.position.addScaledVector(right, moveSpeed);
    }
    if (keys.space) {
        camera.position.addScaledVector(up, moveSpeed);
    }
    if (keys.shift) {
        camera.position.addScaledVector(up, -moveSpeed);
    }
}

// Mouse look for free cam
let isMouseDown = false;
let cameraRotation = { x: 0, y: 0 };

container.addEventListener('mousedown', () => { isMouseDown = true; });
container.addEventListener('mouseup', () => { isMouseDown = false; });
container.addEventListener('mouseleave', () => { isMouseDown = false; });

container.addEventListener('mousemove', (e) => {
    if (!freeCamMode || !isMouseDown) return;
    
    const deltaX = e.movementX * 0.002;
    const deltaY = e.movementY * 0.002;
    
    // Update rotation values without limits
    cameraRotation.y -= deltaX;
    cameraRotation.x -= deltaY;
    
    // Apply rotation using quaternion to avoid gimbal lock
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(cameraRotation.x, cameraRotation.y, 0, 'YXZ'));
    camera.quaternion.copy(quaternion);
});

// Mobile touch gestures - simplified and predictable
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;
let lastTouchDistance = null;

const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
};

container.addEventListener('touchstart', (e) => {
    isTouching = true;
    lastTouchDistance = e.touches.length === 2 ? getTouchDistance(e.touches) : null;
    if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
});

container.addEventListener('touchmove', (e) => {
    if (!isTouching) return;
    
    if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches);
        if (lastTouchDistance !== null) {
            const distanceDelta = lastTouchDistance - currentDistance;
            // Simple zoom functionality for pinch gesture
            const zoomFactor = distanceDelta * 0.02;
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            camera.position.addScaledVector(direction, zoomFactor);
            
            // Limit zoom distance
            const minDistance = 1.2;
            const maxDistance = 220;
            const distance = camera.position.length();
            if (distance < minDistance) {
                camera.position.setLength(minDistance);
            } else if (distance > maxDistance) {
                camera.position.setLength(maxDistance);
            }
        }
        lastTouchDistance = currentDistance;
        return;
    }

    if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        
        // Direct, predictable rotation - 1:1 finger movement
        const rotationSpeed = 0.005;
        cameraRotation.y -= deltaX * rotationSpeed;
        cameraRotation.x -= deltaY * rotationSpeed;
        
        // Clamp vertical rotation to prevent flipping
        cameraRotation.x = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, cameraRotation.x));

        const quaternion = new THREE.Quaternion();
        quaternion.setFromEuler(new THREE.Euler(cameraRotation.x, cameraRotation.y, 0, 'YXZ'));
        camera.quaternion.copy(quaternion);

        // Update start position for continuous movement
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }
}, { passive: false });

container.addEventListener('touchend', (e) => {
    if (!isTouching) return;
    
    if (e.touches.length < 2) {
        lastTouchDistance = null;
    }

    isTouching = false;
});

// Scroll to zoom 
container.addEventListener('wheel', (e) => {
    const zoomSpeed = 0.01;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    camera.position.addScaledVector(direction, -e.deltaY * zoomSpeed);
    
    // Limit zoom distance
    const minDistance = 1.2;
    const maxDistance = 220;
    const distance = camera.position.length();
    if (distance < minDistance) {
        camera.position.setLength(minDistance);
    } else if (distance > maxDistance) {
        camera.position.setLength(maxDistance);
    }
});

// Mouse move for planet hover detection
const planetLabel = document.getElementById('planet-label');
const labelName = document.getElementById('label-name');
const labelInfo = document.getElementById('label-info');

container.addEventListener('mousemove', (e) => {
    // Update mouse coordinates for raycaster
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    // Raycast to detect planet, sun, and black hole hover
    raycaster.setFromCamera(mouse, camera);
    
    const planetMeshes = planets.map(p => p.mesh);
    const allObjects = [...planetMeshes];
    if (sun) allObjects.push(sun);
    if (blackHole) allObjects.push(blackHole);
    
    const intersects = raycaster.intersectObjects(allObjects);
    
    if (intersects.length > 0) {
        const intersectedPlanet = planets.find(p => p.mesh === intersects[0].object);
        
        if (intersectedPlanet) {
            // Show planet label
            planetLabel.style.display = 'block';
            planetLabel.style.left = e.clientX + 20 + 'px';
            planetLabel.style.top = e.clientY + 20 + 'px';
            
            labelName.textContent = intersectedPlanet.displayName;
            labelInfo.textContent = intersectedPlanet.info;
        } else if (intersects[0].object === sun) {
            // Show sun label
            planetLabel.style.display = 'block';
            planetLabel.style.left = e.clientX + 20 + 'px';
            planetLabel.style.top = e.clientY + 20 + 'px';
            
            labelName.textContent = sun.userData.displayName;
            labelInfo.textContent = sun.userData.info;
        } else if (intersects[0].object === blackHole) {
            // Show black hole label
            planetLabel.style.display = 'block';
            planetLabel.style.left = e.clientX + 20 + 'px';
            planetLabel.style.top = e.clientY + 20 + 'px';
            
            labelName.textContent = blackHole.userData.displayName;
            labelInfo.textContent = blackHole.userData.info;
        }
    } else {
        // Hide label
        planetLabel.style.display = 'none';
    }
});

// Navigation buttons
const btnGalaxy = document.getElementById('btn-galaxy');
const btnBlackhole = document.getElementById('btn-blackhole');
const btnCameraView = document.getElementById('btn-camera-view');
const btnFreeCam = document.getElementById('btn-free-cam');
const btnMusic = document.getElementById('btn-music');
const btnSize = document.getElementById('btn-size');

// Button size adjustment
let currentSizeLevel = 1; // 0: small, 1: medium, 2: large
const sizeLevels = [
    {
        padding: '8px 12px',
        fontSize: '11px',
        letterSpacing: '0.3px',
        gap: '6px',
        containerPadding: '8px 12px',
        radius: '6px',
        containerRadius: '10px'
    },
    {
        padding: '12px 24px',
        fontSize: '14px',
        letterSpacing: '1px',
        gap: '15px',
        containerPadding: '15px 25px',
        radius: '10px',
        containerRadius: '16px'
    },
    {
        padding: '16px 32px',
        fontSize: '18px',
        letterSpacing: '1.5px',
        gap: '20px',
        containerPadding: '20px 35px',
        radius: '12px',
        containerRadius: '20px'
    }
];

const updateButtonSize = () => {
    const level = sizeLevels[currentSizeLevel];
    document.documentElement.style.setProperty('--button-padding', level.padding);
    document.documentElement.style.setProperty('--button-font-size', level.fontSize);
    document.documentElement.style.setProperty('--button-letter-spacing', level.letterSpacing);
    document.documentElement.style.setProperty('--button-gap', level.gap);
    document.documentElement.style.setProperty('--container-padding', level.containerPadding);
    document.documentElement.style.setProperty('--button-radius', level.radius);
    document.documentElement.style.setProperty('--container-radius', level.containerRadius);
    
    // Update button text to show current size
    const sizeLabels = ['Small', 'Medium', 'Large'];
    btnSize.textContent = sizeLabels[currentSizeLevel];
};

btnSize.addEventListener('click', () => {
    currentSizeLevel = (currentSizeLevel + 1) % sizeLevels.length;
    updateButtonSize();
});

// Initialize button size
updateButtonSize();

// Music control
const backgroundMusic = document.getElementById('background-music');
let musicPlaying = false;
let musicInitialized = false;

backgroundMusic.volume = 0.45; // 45% volume

// Handle audio loading errors
backgroundMusic.addEventListener('error', (e) => {
    console.error('Audio loading error:', e);
    console.error('Audio error code:', backgroundMusic.error);
    btnMusic.textContent = 'Music: Error';
});

backgroundMusic.addEventListener('canplaythrough', () => {
    console.log('Audio is ready to play');
    musicInitialized = true;
});

const toggleMusic = () => {
    if (musicPlaying) {
        backgroundMusic.pause();
        btnMusic.textContent = 'Music: OFF';
        musicPlaying = false;
    } else {
        backgroundMusic.play().then(() => {
            btnMusic.textContent = 'Music: ON';
            musicPlaying = true;
        }).catch(e => {
            console.error('Audio play failed:', e);
            btnMusic.textContent = 'Music: Error';
        });
    }
};

btnMusic.addEventListener('click', toggleMusic);

// Start music after Big Bang animation completes and user interaction
const startMusicAfterIntro = () => {
    const checkIntroComplete = setInterval(() => {
        if (bigBangPhase === 'complete') {
            clearInterval(checkIntroComplete);
            // Try to play music, but may need user interaction first
            if (!musicPlaying && musicInitialized) {
                backgroundMusic.play().then(() => {
                    btnMusic.textContent = 'Music: ON';
                    musicPlaying = true;
                }).catch(e => {
                    console.log('Autoplay blocked, waiting for user interaction:', e);
                    btnMusic.textContent = 'Music: Tap ON';
                });
            }
        }
    }, 500);
};

// Also try to start music on first user interaction anywhere on page
const enableAudioOnInteraction = () => {
    if (!musicPlaying && musicInitialized && bigBangPhase === 'complete') {
        backgroundMusic.play().then(() => {
            btnMusic.textContent = 'Music: ON';
            musicPlaying = true;
        }).catch(e => {
            console.log('Audio play failed on interaction:', e);
        });
    }
};

// Add click listener to container to enable audio
container.addEventListener('click', enableAudioOnInteraction);
container.addEventListener('touchstart', enableAudioOnInteraction);

startMusicAfterIntro();

btnGalaxy.addEventListener('click', () => {
    if (isAnimating) return;
    isAnimating = true;
    
    const targetPosition = { x: 0, y: 2, z: 4 };
    const duration = 3000;
    const startTime = Date.now();
    const startPosition = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    
    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        camera.position.x = startPosition.x + (targetPosition.x - startPosition.x) * eased;
        camera.position.y = startPosition.y + (targetPosition.y - startPosition.y) * eased;
        camera.position.z = startPosition.z + (targetPosition.z - startPosition.z) * eased;
        camera.lookAt(0, 0, 0);
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        } else {
            isAnimating = false;
        }
    }
    
    animateCamera();
});

btnBlackhole.addEventListener('click', () => {
    if (isAnimating) return;
    isAnimating = true;
    
    const targetPosition = { x: 200, y: 2, z: -82 };
    const duration = 5000;
    const startTime = Date.now();
    const startPosition = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    
    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        camera.position.x = startPosition.x + (targetPosition.x - startPosition.x) * eased;
        camera.position.y = startPosition.y + (targetPosition.y - startPosition.y) * eased;
        camera.position.z = startPosition.z + (targetPosition.z - startPosition.z) * eased;
        camera.lookAt(200, 0, -100);
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        } else {
            isAnimating = false;
        }
    }
    
    animateCamera();
});

// Camera View button - cycle through preset views
btnCameraView.addEventListener('click', () => {
    if (isAnimating || freeCamMode) return;
    
    // Don't cycle views if camera is at black hole position
    if (camera.position.x > 100) return;
    
    currentView = (currentView + 1) % views.length;
    
    const targetView = views[currentView];
    
    // Smooth camera animation
    const startZ = camera.position.z;
    const startY = camera.position.y;
    const duration = 1000;
    const startTime = Date.now();
    
    isAnimating = true;
    
    function animateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        camera.position.z = startZ + (targetView.z - startZ) * eased;
        camera.position.y = startY + (targetView.y - startY) * eased;
        camera.lookAt(0, 0, 0);
        
        if (progress < 1) {
            requestAnimationFrame(animateCamera);
        } else {
            isAnimating = false;
        }
    }
    
    animateCamera();
});

// Free Cam button - toggle free camera mode
btnFreeCam.addEventListener('click', () => {
    if (isAnimating) return;
    
    freeCamMode = !freeCamMode;
    
    if (freeCamMode) {
        container.style.cursor = 'crosshair';
    } else {
        container.style.cursor = 'default';
        // Reset to current view
        const targetView = views[currentView];
        camera.position.z = targetView.z;
        camera.position.y = targetView.y;
        camera.position.x = 0;
        camera.rotation.set(0, 0, 0);
        camera.lookAt(0, 0, 0);
    }
});
function generateExoplanets() {{
    
    }
}
