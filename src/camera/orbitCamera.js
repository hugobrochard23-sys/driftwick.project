/* Caméra orbitale simple : angle horizontal (yaw), inclinaison (pitch), distance (zoom), cible au sol (pan).
 * Navigateur uniquement (manipule un THREE.Camera) — vérifiée visuellement, pas par test unitaire Node. */
(function (global) {
  class OrbitCamera {
    constructor(camera, target) {
      this.camera = camera;
      this.target = { x: 0, y: 0, z: 0, ...target };
      this.yaw = Math.PI * 0.25;
      this.pitch = 0.4;
      this.distance = 20;
      this.minDistance = 4;
      this.maxDistance = 60;
      this.minPitch = 0.15;
      this.maxPitch = 1.45;
      this._apply();
    }

    orbit(dYaw, dPitch) {
      this.yaw += dYaw;
      this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch + dPitch));
      this._apply();
    }

    pan(dx, dz) {
      const cosY = Math.cos(this.yaw), sinY = Math.sin(this.yaw);
      const scale = this.distance * 0.0025;
      this.target.x += (dx * cosY - dz * sinY) * scale;
      this.target.z += (dx * sinY + dz * cosY) * scale;
      this._apply();
    }

    zoom(factor) {
      this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance * factor));
      this._apply();
    }

    _apply() {
      const x = this.target.x + this.distance * Math.cos(this.pitch) * Math.sin(this.yaw);
      const y = this.target.y + this.distance * Math.sin(this.pitch);
      const z = this.target.z + this.distance * Math.cos(this.pitch) * Math.cos(this.yaw);
      this.camera.position.set(x, y, z);
      this.camera.lookAt(this.target.x, this.target.y, this.target.z);
    }
  }

  const ns = (global.DW = global.DW || {});
  ns.OrbitCamera = OrbitCamera;
})(window);
