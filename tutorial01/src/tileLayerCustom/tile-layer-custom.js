import _defineProperty from "@babel/runtime/helpers/esm/defineProperty";
import { CompositeLayer, _flatten as flatten } from '@deck.gl/core';
import { GeoJsonLayer } from '@deck.gl/layers';
import Tileset2D, { STRATEGY_DEFAULT } from './tileset-2d-custom';
import { urlType, getURLFromTemplate } from './utils-custom';


const defaultProps = {
  TilesetClass: Tileset2D,
  data: {
    type: 'data',
    value: []
  },
  dataComparator: urlType.equals,
  renderSubLayers: {
    type: 'function',
    value: props => new GeoJsonLayer(props),
    compare: false
  },
  getTileData: {
    type: 'function',
    optional: true,
    value: null,
    compare: false
  },
  onViewportLoad: {
    type: 'function',
    optional: true,
    value: null,
    compare: false
  },
  onTileLoad: {
    type: 'function',
    value: tile => {},
    compare: false
  },
  onTileUnload: {
    type: 'function',
    value: tile => {},
    compare: false
  },
  onTileError: {
    type: 'function',
    value: err => console.error(err),
    compare: false
  },
  extent: {
    type: 'array',
    optional: true,
    value: null,
    compare: true
  },
  tileSize: 512,
  maxZoom: null,
  minZoom: 0,
  maxCacheSize: null,
  maxCacheByteSize: null,
  refinementStrategy: STRATEGY_DEFAULT,
  zRange: null,
  maxRequests: 6,
  zoomOffset: 0
};
class TileLayerCustom extends CompositeLayer {
  initializeState() {
    this.state = {
      tileset: null,
      isLoaded: false
    };
  }

  finalizeState() {
    var _this$state, _this$state$tileset;

    (_this$state = this.state) === null || _this$state === void 0 ? void 0 : (_this$state$tileset = _this$state.tileset) === null || _this$state$tileset === void 0 ? void 0 : _this$state$tileset.finalize();
  }

  get isLoaded() {
    var _this$state2, _this$state2$tileset;

    return (_this$state2 = this.state) === null || _this$state2 === void 0 ? void 0 : (_this$state2$tileset = _this$state2.tileset) === null || _this$state2$tileset === void 0 ? void 0 : _this$state2$tileset.selectedTiles.every(tile => tile.isLoaded && tile.layers && tile.layers.every(layer => layer.isLoaded));
  }

  shouldUpdateState({
    changeFlags
  }) {
    return changeFlags.somethingChanged;
  }

  updateState({
    changeFlags
  }) {
    let {
      tileset
    } = this.state;
    const propsChanged = changeFlags.propsOrDataChanged || changeFlags.updateTriggersChanged;
    const dataChanged = changeFlags.dataChanged || changeFlags.updateTriggersChanged && (changeFlags.updateTriggersChanged.all || changeFlags.updateTriggersChanged.getTileData);

    if (!tileset) {
      tileset = new this.props.TilesetClass(this._getTilesetOptions());
      this.setState({
        tileset
      });
    } else if (propsChanged) {
      tileset.setOptions(this._getTilesetOptions());

      if (dataChanged) {
        tileset.reloadAll();
      } else {
        this.state.tileset.tiles.forEach(tile => {
          tile.layers = null;
        });
      }
    }

    this._updateTileset();
  }

  _getTilesetOptions() {
    const {
      tileSize,
      maxCacheSize,
      maxCacheByteSize,
      refinementStrategy,
      extent,
      maxZoom,
      minZoom,
      maxRequests,
      zoomOffset
    } = this.props;
    return {
      maxCacheSize,
      maxCacheByteSize,
      maxZoom,
      minZoom,
      tileSize,
      refinementStrategy,
      extent,
      maxRequests,
      zoomOffset,
      getTileData: this.getTileData.bind(this),
      onTileLoad: this._onTileLoad.bind(this),
      onTileError: this._onTileError.bind(this),
      onTileUnload: this._onTileUnload.bind(this)
    };
  }

  _updateTileset() {
    const {
      tileset
    } = this.state;
    const {
      zRange,
      modelMatrix
    } = this.props;
    const frameNumber = tileset.update(this.context.viewport, {
      zRange,
      modelMatrix
    });
    const {
      isLoaded
    } = tileset;
    const loadingStateChanged = this.state.isLoaded !== isLoaded;
    const tilesetChanged = this.state.frameNumber !== frameNumber;

    if (isLoaded && (loadingStateChanged || tilesetChanged)) {
      this._onViewportLoad();
    }

    if (tilesetChanged) {
      this.setState({
        frameNumber
      });
    }

    this.state.isLoaded = isLoaded;
  }

  _onViewportLoad() {
    const {
      tileset
    } = this.state;
    const {
      onViewportLoad
    } = this.props;

    if (onViewportLoad) {
      onViewportLoad(tileset.selectedTiles);
    }
  }

  _onTileLoad(tile) {
    this.props.onTileLoad(tile);
    tile.layers = null;
    this.setNeedsUpdate();
  }

  _onTileError(error, tile) {
    this.props.onTileError(error);
    tile.layers = null;
    this.setNeedsUpdate();
  }

  _onTileUnload(tile) {
    this.props.onTileUnload(tile);
  }

  getTileData(tile) {
    const {
      data,
      getTileData,
      fetch
    } = this.props;
    const {
      signal
    } = tile;
    tile.url = typeof data === 'string' || Array.isArray(data) ? getURLFromTemplate(data, tile) : null;

    if (getTileData) {
      return getTileData(tile);
    }

    if (fetch && tile.url) {
      return fetch(tile.url, {
        propName: 'data',
        layer: this,
        signal
      });
    }

    return null;
  }

  renderSubLayers(props) {
    return this.props.renderSubLayers(props);
  }

  getSubLayerPropsByTile(tile) {
    return null;
  }

  getPickingInfo({
    info,
    sourceLayer
  }) {
    if (info.picked) {
      info.tile = sourceLayer.props.tile;
    }

    return info;
  }

  _updateAutoHighlight(info) {
    if (info.sourceLayer) {
      info.sourceLayer.updateAutoHighlight(info);
    }
  }

  renderLayers() {
    return this.state.tileset.tiles.map(tile => {
      const subLayerProps = this.getSubLayerPropsByTile(tile);

      if (!tile.isLoaded && !tile.content) {

      } else if (!tile.layers) {
        const layers = this.renderSubLayers({ ...this.props,
          id: "".concat(this.id, "-").concat(tile.id),
          data: tile.content,
          _offset: 0,
          tile
        });
        tile.layers = flatten(layers, Boolean).map(layer => layer.clone({
          tile,
          ...subLayerProps
        }));
      } else if (subLayerProps && tile.layers[0] && Object.keys(subLayerProps).some(propName => tile.layers[0].props[propName] !== subLayerProps[propName])) {
        tile.layers = tile.layers.map(layer => layer.clone(subLayerProps));
      }

      return tile.layers;
    });
  }

  filterSubLayer({
    layer,
    cullRect
  }) {
    //여기도 한계
    //한번 캐시에 들어온 타일은 제어할 수 있으나, 애초에 캐시에 들어오게 할 수가 없다.
    const {
      tile
    } = layer.props;
    //console.log(layer);
    //return true;
    return this.state.tileset.isTileVisible(tile, cullRect);
  }

}

_defineProperty(TileLayerCustom, "defaultProps", defaultProps);

_defineProperty(TileLayerCustom, "layerName", 'TileLayerCustom');
//# sourceMappingURL=tile-layer.js.map

export {TileLayerCustom} 