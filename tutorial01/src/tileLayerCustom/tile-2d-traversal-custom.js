import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { WebMercatorViewport, _GlobeViewport } from '@deck.gl/core';
import { CullingVolume, Plane, AxisAlignedBoundingBox, makeOrientedBoundingBoxFromPoints } from '@math.gl/culling';
import { lngLatToWorld } from '@math.gl/web-mercator';
import { osmTile2lngLat } from './utils-custom';
const TILE_SIZE = 512;
const MAX_MAPS = 3;
const REF_POINTS_5 = [[0.5, 0.5], [0, 0], [0, 1], [1, 0], [1, 1]];
const REF_POINTS_9 = REF_POINTS_5.concat([[0, 0.5], [0.5, 0], [1, 0.5], [0.5, 1]]);
const REF_POINTS_11 = REF_POINTS_9.concat([[0.25, 0.5], [0.75, 0.5]]);

class OSMNode {
  constructor(x, y, z) {
    _defineProperty(this, "x", void 0);

    _defineProperty(this, "y", void 0);

    _defineProperty(this, "z", void 0);

    _defineProperty(this, "childVisible", void 0);

    _defineProperty(this, "selected", void 0);

    _defineProperty(this, "_children", void 0);

    this.x = x;
    this.y = y;
    this.z = z;
  }

  get children() {
    if (!this._children) {
      const x = this.x * 2;
      const y = this.y * 2;
      const z = this.z + 1;
      this._children = [new OSMNode(x, y, z), new OSMNode(x, y + 1, z), new OSMNode(x + 1, y, z), new OSMNode(x + 1, y + 1, z)];
    }

    return this._children;
  }

  update(params) {
    const {
      viewport,
      cullingVolume,
      elevationBounds,
      minZ,
      maxZ,
      bounds,
      offset,
      project
    } = params;
    const boundingVolume = this.getBoundingVolume(elevationBounds, offset, project); //offset 소용없음 전체적으로 움직임
    
    if (bounds && !this.insideBounds(bounds)) {
      return false;
    }


    const isInside = cullingVolume.computeVisibility(boundingVolume); //바운딩 볼륨을 키우면 타일 안 짤림

    if (isInside < 0) {

      return false;
    }

    if (!this.childVisible) {
      let {
        z
      } = this;

      if (z < maxZ && z >= minZ) {
        const distance = boundingVolume.distanceTo(viewport.cameraPosition) * viewport.scale / viewport.height;
        z += Math.floor(Math.log2(distance));
      }

      if (z >= maxZ) {
        this.selected = true;
        return true;
      }
    }

    this.selected = false;
    this.childVisible = true;

    for (const child of this.children) {
      child.update(params);
    }

    return true;
  }

  getSelected(result = []) {
    if (this.selected) {
      result.push(this);
    }

    if (this._children) {
      for (const node of this._children) {
        node.getSelected(result);
      }
    }

    return result;
  }

  insideBounds([minX, minY, maxX, maxY]) {
    const scale = Math.pow(2, this.z);
    const extent = TILE_SIZE / scale;
    return this.x * extent < maxX && this.y * extent < maxY && (this.x + 1) * extent > minX && (this.y + 1) * extent > minY;
  }

  getBoundingVolume(zRange, worldOffset, project) {
    //console.log(zRange, worldOffset, project);
    if (project) {
     
      const refPoints = this.z < 1 ? REF_POINTS_11 : this.z < 2 ? REF_POINTS_9 : REF_POINTS_5;
      const refPointPositions = [];

      for (const p of refPoints) {
        const lngLat = osmTile2lngLat(this.x + p[0], this.y + p[1], this.z);
        lngLat[2] = zRange[0];
        refPointPositions.push(project(lngLat));

        if (zRange[0] !== zRange[1]) {
          lngLat[2] = zRange[1];
          refPointPositions.push(project(lngLat));
        }
      }

      return makeOrientedBoundingBoxFromPoints(refPointPositions);
    }
   
    const scale = Math.pow(2, this.z);
    const extent = TILE_SIZE / scale;
    const originX = this.x * extent + worldOffset * TILE_SIZE;
    const originY = TILE_SIZE - (this.y + 1) * extent;
    //console.log([originX, originY, zRange[0]], [originX + extent, originY + extent, zRange[1]]);
    //console.log(new AxisAlignedBoundingBox([originX-extent, originY-extent, zRange[0]], [originX + 2*extent, originY + 2*extent, zRange[1]]));
    
    const extraExtent = extent * 0.4;
    const newBBox = new AxisAlignedBoundingBox([originX-extraExtent, originY-extraExtent, zRange[0]],
       [originX + extent+extraExtent, originY + extent+extraExtent, zRange[1]]);
    return newBBox;
    //return new AxisAlignedBoundingBox([originX -0.3*extent, originY-0.3*extent, zRange[0]], [originX + 1.3 * extent, originY + 1.3 *extent, zRange[1]]);
  }

}

export function getOSMTileIndices(viewport, maxZ, zRange, bounds) {
  const project = viewport instanceof _GlobeViewport && viewport.resolution ? viewport.projectPosition : null;
  const planes = Object.values(viewport.getFrustumPlanes()).map(({
    normal,
    distance
  }) => new Plane(normal.clone().negate(), distance));
  const cullingVolume = new CullingVolume(planes);
  const unitsPerMeter = viewport.distanceScales.unitsPerMeter[2];
  const elevationMin = zRange && zRange[0] * unitsPerMeter || 0;
  const elevationMax = zRange && zRange[1] * unitsPerMeter || 0;
  const minZ = viewport instanceof WebMercatorViewport && viewport.pitch <= 60 ? maxZ : 0;

  if (bounds) {
    const [minLng, minLat, maxLng, maxLat] = bounds;
    const topLeft = lngLatToWorld([minLng, maxLat]);
    const bottomRight = lngLatToWorld([maxLng, minLat]);
    bounds = [topLeft[0], TILE_SIZE - topLeft[1], bottomRight[0], TILE_SIZE - bottomRight[1]];
  }
  //console.log("cullingVolume",cullingVolume);
  //cullingVolume.planes[0].distance  -= 100;
  //console.log("cullingVolume",cullingVolume);
  const root = new OSMNode(0, 0, 0);
  const traversalParams = {
    viewport,
    project,
    cullingVolume,
    elevationBounds: [elevationMin, elevationMax],
    minZ,
    maxZ,
    bounds, //bound 소용없음. 전체적으로 움직임.
    offset: 0
  };
  root.update(traversalParams);

  if (viewport instanceof WebMercatorViewport && viewport.subViewports && viewport.subViewports.length > 1) {
    traversalParams.offset = -1;

    while (root.update(traversalParams)) {
      if (--traversalParams.offset < -MAX_MAPS) {
        break;
      }
    }

    traversalParams.offset = 1;

    while (root.update(traversalParams)) {
      if (++traversalParams.offset > MAX_MAPS) {
        break;
      }
    }
  }
  //여기에 올때는 이미 update 통해서 그려지는 것들이 정해짐
  //console.log(root.getSelected());
  //console.log(traversalParams);
  return root.getSelected();
}
//# sourceMappingURL=tile-2d-traversal.js.map