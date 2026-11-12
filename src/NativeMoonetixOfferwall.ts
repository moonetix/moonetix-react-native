import { TurboModuleRegistry, type TurboModule } from 'react-native';

// Codegen spec of the native module. App code uses Moonetix from the package root instead.
export interface Spec extends TurboModule {
  // Not named init: on iOS a method called init would belong to the Objective-C init family.
  configure(appId: string): void;
  // toolbarColor is an opaque 24-bit RGB value, or -1 for the color from the Design tab.
  open(token: string, title: string | null, toolbarColor: number, showLogo: boolean): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.get<Spec>('MoonetixOfferwall');
