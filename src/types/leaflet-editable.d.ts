import * as L from "leaflet";

declare module "leaflet" {
  class Editable {
    constructor(map: L.Map, options?: any);

    startPolygon(): L.Polygon;
    startPolyline(): L.Polyline;
    startMarker(
      latlng?: L.LatLngExpression,
      options?: L.MarkerOptions
    ): L.Marker;
    startRectangle(): L.Rectangle;
    startCircle(
      latlng?: L.LatLngExpression,
      options?: L.CircleMarkerOptions
    ): L.Circle;
    stopDrawing(): void;
  }

  interface Map {
    editTools: Editable;
  }
}
