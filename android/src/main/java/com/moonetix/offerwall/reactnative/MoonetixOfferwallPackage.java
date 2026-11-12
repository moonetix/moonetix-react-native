package com.moonetix.offerwall.reactnative;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;

import java.util.HashMap;
import java.util.Map;

/**
 * Registers the Moonetix module. React Native autolinking adds this package to your app.
 *
 * <p>{@code implements ReactPackage} is redundant for the compiler, but the autolinking of React Native
 * CLI 15.0 (React Native 0.77) only finds packages declared that way or as TurboReactPackage subclasses.
 */
public class MoonetixOfferwallPackage extends BaseReactPackage implements ReactPackage {

    @Nullable
    @Override
    public NativeModule getModule(@NonNull String name, @NonNull ReactApplicationContext reactContext) {
        return MoonetixOfferwallModule.NAME.equals(name) ? new MoonetixOfferwallModule(reactContext) : null;
    }

    @NonNull
    @Override
    public ReactModuleInfoProvider getReactModuleInfoProvider() {
        // A TurboModule with the New Architecture, a bridge module with the old one.
        final boolean turbo = TurboModule.class.isAssignableFrom(MoonetixOfferwallModule.class);
        return new ReactModuleInfoProvider() {
            @NonNull
            @Override
            public Map<String, ReactModuleInfo> getReactModuleInfos() {
                Map<String, ReactModuleInfo> infos = new HashMap<>();
                infos.put(MoonetixOfferwallModule.NAME, new ReactModuleInfo(
                        MoonetixOfferwallModule.NAME,
                        MoonetixOfferwallModule.class.getName(),
                        false,
                        false,
                        false,
                        turbo));
                return infos;
            }
        };
    }
}
