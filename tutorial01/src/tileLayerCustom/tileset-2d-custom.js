import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import Tile2DHeader from './tile-2d-header-custom';
import { getTileIndices, tileToBoundingBox, getCullBounds } from './utils-custom';
import { RequestScheduler } from '@loaders.gl/loader-utils';
import { Matrix4, equals } from '@math.gl/core';
import { _memoize as memoize } from '@deck.gl/core';
const TILE_STATE_VISITED = 1;
const TILE_STATE_VISIBLE = 2;
export const STRATEGY_NEVER = 'never';
export const STRATEGY_REPLACE = 'no-overlap';
export const STRATEGY_DEFAULT = 'best-available';
const DEFAULT_CACHE_SCALE = 5;
const STRATEGIES = {
  [STRATEGY_DEFAULT]: updateTileStateDefault,
  [STRATEGY_REPLACE]: updateTileStateReplace,
  [STRATEGY_NEVER]: () => {}
};
export default class Tileset2D {
  constructor(opts) {
    _defineProperty(this, "opts", void 0);

    _defineProperty(this, "_requestScheduler", void 0);

    _defineProperty(this, "_cache", void 0);

    _defineProperty(this, "_dirty", void 0);

    _defineProperty(this, "_tiles", void 0);

    _defineProperty(this, "_cacheByteSize", void 0);

    _defineProperty(this, "_viewport", void 0);

    _defineProperty(this, "_zRange", void 0);

    _defineProperty(this, "_selectedTiles", void 0);

    _defineProperty(this, "_frameNumber", void 0);

    _defineProperty(this, "_modelMatrix", void 0);

    _defineProperty(this, "_modelMatrixInverse", void 0);

    _defineProperty(this, "_maxZoom", void 0);

    _defineProperty(this, "_minZoom", void 0);

    _defineProperty(this, "onTileLoad", void 0);

    _defineProperty(this, "_getCullBounds", memoize(getCullBounds));

    this.opts = opts;

    this.onTileLoad = tile => {
      this.opts.onTileLoad(tile);

      if (this.opts.maxCacheByteSize) {
        this._cacheByteSize += tile.byteLength;

        this._resizeCache();
      }
    };

    this._requestScheduler = new RequestScheduler({
      maxRequests: opts.maxRequests,
      throttleRequests: opts.maxRequests > 0
    });
    this._cache = new Map();
    this._tiles = [];
    this._dirty = false;
    this._cacheByteSize = 0;
    this._viewport = null;
    this._selectedTiles = null;
    this._frameNumber = 0;
    this._modelMatrix = new Matrix4();
    this._modelMatrixInverse = new Matrix4();
    this.setOptions(opts);
  }

  get tiles() {
    return this._tiles;
  }

  get selectedTiles() {
    return this._selectedTiles;
  }

  get isLoaded() {
    return this._selectedTiles !== null && this._selectedTiles.every(tile => tile.isLoaded);
  }

  get needsReload() {
    return this._selectedTiles !== null && this._selectedTiles.some(tile => tile.needsReload);
  }

  setOptions(opts) {
    Object.assign(this.opts, opts);

    if (Number.isFinite(opts.maxZoom)) {
      this._maxZoom = Math.floor(opts.maxZoom);
    }

    if (Number.isFinite(opts.minZoom)) {
      this._minZoom = Math.ceil(opts.minZoom);
    }
  }

  finalize() {
    for (const tile of this._cache.values()) {
      if (tile.isLoading) {
        tile.abort();
      }
    }

    this._cache.clear();

    this._tiles = [];
    this._selectedTiles = null;
  }

  reloadAll() {
    for (const id of this._cache.keys()) {
      const tile = this._cache.get(id);

      if (!this._selectedTiles || !this._selectedTiles.includes(tile)) {
        this._cache.delete(id);
      } else {
        tile.setNeedsReload();
      }
    }
  }

  update(viewport, {
    zRange,
    modelMatrix
  } = {}) {
    const modelMatrixAsMatrix4 = new Matrix4(modelMatrix);
    const isModelMatrixNew = !modelMatrixAsMatrix4.equals(this._modelMatrix);

    if (!this._viewport || !viewport.equals(this._viewport) || !equals(this._zRange, zRange) || isModelMatrixNew) {
      if (isModelMatrixNew) {
        this._modelMatrixInverse = modelMatrixAsMatrix4.clone().invert();
        this._modelMatrix = modelMatrixAsMatrix4;
      }

      this._viewport = viewport;
      this._zRange = zRange;
      const tileIndices = this.getTileIndices({
        viewport,
        maxZoom: this._maxZoom,
        minZoom: this._minZoom,
        zRange,
        modelMatrix: this._modelMatrix,
        modelMatrixInverse: this._modelMatrixInverse
      });
      this._selectedTiles = tileIndices.map(index => this._getTile(index, true));

      if (this._dirty) {
        this._rebuildTree();
      }
    } else if (this.needsReload) {
      this._selectedTiles = this._selectedTiles.map(tile => this._getTile(tile.index, true));
    }

    const changed = this.updateTileStates();

    this._pruneRequests();

    if (this._dirty) {
      this._resizeCache();
    }

    if (changed) {
      this._frameNumber++;
    }

    return this._frameNumber;
  }

  isTileVisible(tile, cullRect) {
    if (!tile.isVisible) {
      return false;
    }
    //console.log(this._viewport);
    if (cullRect && this._viewport) {
      const [minX, minY, maxX, maxY] = getCullBounds({
        viewport: this._viewport,
        z: this._zRange,
        cullRect
      });
      const {
        bbox
      } = tile;
      //console.log(1,[minX, minY, maxX, maxY]);
      if ('west' in bbox) {
        return bbox.west < maxX && bbox.east > minX && bbox.south < maxY && bbox.north > minY;
      }
      //console.log([minX, minY, maxX, maxY]);
      const y0 = Math.min(bbox.top, bbox.bottom);
      const y1 = Math.max(bbox.top, bbox.bottom);
      return bbox.left < maxX && bbox.right > minX && y0 < maxY && y1 > minY;
    }

    return true;
  }

  getTileIndices({
    viewport,
    maxZoom,
    minZoom,
    zRange,
    modelMatrix,
    modelMatrixInverse
  }) {
    const {
      tileSize,
      extent,
      zoomOffset
    } = this.opts;
    return getTileIndices({
      viewport,
      maxZoom,
      minZoom,
      zRange,
      tileSize,
      extent: extent,
      modelMatrix,
      modelMatrixInverse,
      zoomOffset
    });
  }

  getTileId(index) {
    return "".concat(index.x, "-").concat(index.y, "-").concat(index.z);
  }

  getTileZoom(index) {
    return index.z;
  }

  getTileMetadata(index) {
    const {
      tileSize
    } = this.opts;
    return {
      bbox: tileToBoundingBox(this._viewport, index.x, index.y, index.z, tileSize)
    };
  }

  getParentIndex(index) {
    const x = Math.floor(index.x / 2);
    const y = Math.floor(index.y / 2);
    const z = index.z - 1;
    return {
      x,
      y,
      z
    };
  }

  updateTileStates() {
    const refinementStrategy = this.opts.refinementStrategy || STRATEGY_DEFAULT;
    const visibilities = new Array(this._cache.size);
    let i = 0;

    for (const tile of this._cache.values()) {
      visibilities[i++] = tile.isVisible;
      tile.isSelected = false;
      tile.isVisible = false;
    }

    for (const tile of this._selectedTiles) {
      tile.isSelected = true;
      tile.isVisible = true;
    }

    (typeof refinementStrategy === 'function' ? refinementStrategy : STRATEGIES[refinementStrategy])(Array.from(this._cache.values()));
    i = 0;

    for (const tile of this._cache.values()) {
      if (visibilities[i++] !== tile.isVisible) {
        return true;
      }
    }

    return false;
  }

  _pruneRequests() {
    const {
      maxRequests
    } = this.opts;
    const abortCandidates = [];
    let ongoingRequestCount = 0;

    for (const tile of this._cache.values()) {
      if (tile.isLoading) {
        ongoingRequestCount++;

        if (!tile.isSelected && !tile.isVisible) {
          abortCandidates.push(tile);
        }
      }
    }

    while (maxRequests > 0 && ongoingRequestCount > maxRequests && abortCandidates.length > 0) {
      const tile = abortCandidates.shift();
      tile.abort();
      ongoingRequestCount--;
    }
  }

  _rebuildTree() {
    const {
      _cache
    } = this;

    for (const tile of _cache.values()) {
      tile.parent = null;

      if (tile.children) {
        tile.children.length = 0;
      }
    }

    for (const tile of _cache.values()) {
      const parent = this._getNearestAncestor(tile);

      tile.parent = parent;

      if (parent !== null && parent !== void 0 && parent.children) {
        parent.children.push(tile);
      }
    }
  }

  _resizeCache() {
    const {
      _cache,
      opts
    } = this;
    const maxCacheSize = opts.maxCacheSize || (opts.maxCacheByteSize ? Infinity : DEFAULT_CACHE_SCALE * this.selectedTiles.length);
    const maxCacheByteSize = opts.maxCacheByteSize || Infinity;
    const overflown = _cache.size > maxCacheSize || this._cacheByteSize > maxCacheByteSize;

    if (overflown) {
      for (const [id, tile] of _cache) {
        if (!tile.isVisible && !tile.isSelected) {
          this._cacheByteSize -= opts.maxCacheByteSize ? tile.byteLength : 0;

          _cache.delete(id);

          this.opts.onTileUnload(tile);
        }

        if (_cache.size <= maxCacheSize && this._cacheByteSize <= maxCacheByteSize) {
          break;
        }
      }

      this._rebuildTree();

      this._dirty = true;
    }

    if (this._dirty) {
      this._tiles = Array.from(this._cache.values()).sort((t1, t2) => t1.zoom - t2.zoom);
      this._dirty = false;
    }
  }

  _getTile(index, create) {
    const id = this.getTileId(index);

    let tile = this._cache.get(id);

    let needsReload = false;

    if (!tile && create) {
      tile = new Tile2DHeader(index);
      Object.assign(tile, this.getTileMetadata(tile.index));
      Object.assign(tile, {
        id,
        zoom: this.getTileZoom(tile.index)
      });
      needsReload = true;

      this._cache.set(id, tile);

      this._dirty = true;
    } else if (tile && tile.needsReload) {
      needsReload = true;
    }

    if (tile && needsReload) {
      tile.loadData({
        getData: this.opts.getTileData,
        requestScheduler: this._requestScheduler,
        onLoad: this.onTileLoad,
        onError: this.opts.onTileError
      });
    }

    return tile;
  }

  _getNearestAncestor(tile) {
    const {
      _minZoom = 0
    } = this;
    let index = tile.index;

    while (this.getTileZoom(index) > _minZoom) {
      index = this.getParentIndex(index);

      const parent = this._getTile(index);

      if (parent) {
        return parent;
      }
    }

    return null;
  }

}

function updateTileStateDefault(allTiles) {
  for (const tile of allTiles) {
    tile.state = 0;
  }

  for (const tile of allTiles) {
    if (tile.isSelected && !getPlaceholderInAncestors(tile)) {
      getPlaceholderInChildren(tile);
    }
  }

  for (const tile of allTiles) {
    tile.isVisible = Boolean(tile.state & TILE_STATE_VISIBLE);
  }
}

function updateTileStateReplace(allTiles) {
  for (const tile of allTiles) {
    tile.state = 0;
  }

  for (const tile of allTiles) {
    if (tile.isSelected) {
      getPlaceholderInAncestors(tile);
    }
  }

  const sortedTiles = Array.from(allTiles).sort((t1, t2) => t1.zoom - t2.zoom);

  for (const tile of sortedTiles) {
    tile.isVisible = Boolean(tile.state & TILE_STATE_VISIBLE);

    if (tile.children && (tile.isVisible || tile.state & TILE_STATE_VISITED)) {
      for (const child of tile.children) {
        child.state = TILE_STATE_VISITED;
      }
    } else if (tile.isSelected) {
      getPlaceholderInChildren(tile);
    }
  }
}

function getPlaceholderInAncestors(startTile) {
  let tile = startTile;

  while (tile) {
    if (tile.isLoaded || tile.content) {
      tile.state |= TILE_STATE_VISIBLE;
      return true;
    }

    tile = tile.parent;
  }

  return false;
}

function getPlaceholderInChildren(tile) {
  for (const child of tile.children) {
    if (child.isLoaded || child.content) {
      child.state |= TILE_STATE_VISIBLE;
    } else {
      getPlaceholderInChildren(child);
    }
  }
}
//# sourceMappingURL=tileset-2d.js.map