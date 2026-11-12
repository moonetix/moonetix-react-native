package com.moonetix.offerwall.reactnative;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.moonetix.offerwall.Moonetix;
import com.moonetix.offerwall.MoonetixError;
import com.moonetix.offerwall.MoonetixListener;
import com.moonetix.offerwall.MoonetixOptions;

/**
 * Forwards {@code Moonetix.init} and {@code Moonetix.open} from JavaScript to the native Moonetix
 * Android SDK ({@code com.moonetix:offerwall}) and sends its events back as one device event,
 * {@code MoonetixOfferwallEvent}, with {@code type} and, for errors, {@code code} and {@code message}.
 *
 * <p>The session token only passes through memory. It is never logged.
 */
@ReactModule(name = MoonetixOfferwallModule.NAME)
public final class MoonetixOfferwallModule extends MoonetixOfferwallSpec {

    public static final String NAME = "MoonetixOfferwall";
    static final String EVENT = "MoonetixOfferwallEvent";
    static final String NO_ACTIVITY_MESSAGE =
            "Moonetix.open() needs a visible screen. Call it while your app is in the foreground.";

    // The native SDK keeps one listener for the whole process; this is the one we set last.
    private static MoonetixListener activeListener;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final MoonetixListener forwarder = new MoonetixListener() {
        @Override
        public void onOpened() {
            sendEvent("opened", null, null);
        }

        @Override
        public void onClosed() {
            sendEvent("closed", null, null);
        }

        @Override
        public void onError(@NonNull MoonetixError error) {
            sendEvent("error", error.getCode().name(), error.getMessage());
        }
    };

    MoonetixOfferwallModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    @NonNull
    public String getName() {
        return NAME;
    }

    @Override
    @ReactMethod
    public void configure(final String appId) {
        final Context appContext = getReactApplicationContext().getApplicationContext();
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                Moonetix.init(appContext, appId == null ? "" : appId);
                useOurListener();
            }
        });
    }

    @Override
    @ReactMethod
    public void open(final String token, @Nullable final String title, final double toolbarColor, final boolean showLogo) {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                Activity activity = getReactApplicationContext().getCurrentActivity();
                if (activity == null) {
                    sendEvent("error", "UNKNOWN", NO_ACTIVITY_MESSAGE);
                    return;
                }
                // The React instance that opens the offerwall receives its events.
                useOurListener();
                try {
                    Moonetix.open(activity, token == null ? "" : token, options(title, toolbarColor, showLogo));
                } catch (RuntimeException e) {
                    sendEvent("error", "UNKNOWN", "Could not open the offerwall: " + e.getClass().getSimpleName() + ".");
                }
            }
        });
    }

    @Override
    @ReactMethod
    public void addListener(String eventName) {
        // Events are sent as device events; nothing to start.
    }

    @Override
    @ReactMethod
    public void removeListeners(double count) {
        // Nothing to stop.
    }

    @Override
    public void invalidate() {
        synchronized (MoonetixOfferwallModule.class) {
            if (activeListener == forwarder) {
                Moonetix.setListener(null);
                activeListener = null;
            }
        }
        super.invalidate();
    }

    private void useOurListener() {
        synchronized (MoonetixOfferwallModule.class) {
            Moonetix.setListener(forwarder);
            activeListener = forwarder;
        }
    }

    /** Maps the JavaScript options: an empty title and a color outside 0..0xFFFFFF mean "use the Design tab". */
    @NonNull
    static MoonetixOptions options(@Nullable String title, double toolbarColor, boolean showLogo) {
        String cleanTitle = title == null || title.trim().isEmpty() ? null : title;
        Integer color = toolbarColor >= 0 && toolbarColor <= 0xFFFFFF
                ? Integer.valueOf(0xFF000000 | (int) toolbarColor)
                : null;
        return new MoonetixOptions(cleanTitle, color, showLogo);
    }

    private void sendEvent(@NonNull String type, @Nullable String code, @Nullable String message) {
        ReactApplicationContext context = getReactApplicationContext();
        if (!context.hasActiveReactInstance()) {
            return;
        }
        WritableMap body = Arguments.createMap();
        body.putString("type", type);
        if (code != null) {
            body.putString("code", code);
            body.putString("message", message == null ? "" : message);
        }
        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(EVENT, body);
    }
}
