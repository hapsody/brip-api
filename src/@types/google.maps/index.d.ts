/// <reference path="../../../node_modules/@types/google.maps/index.d.ts" />
declare module google.maps {
  export class IBLatLng {
    lat: string;

    lng: string;
  }
}
declare namespace google.maps.places {
  export type IBPlaceResult = Omit<PlaceResult, 'geometry'> & {
    geometry?: {
      location?: google.maps.IBLatLng;
      viewport?: {
        northeast?: google.maps.IBLatLng;
        southwest?: google.maps.IBLatLng;
      };
    };
  };
}
