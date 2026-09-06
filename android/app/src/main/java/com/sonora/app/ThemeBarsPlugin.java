package com.sonora.app;

import android.graphics.Color;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Toggles the bottom 3-button/gesture navigation bar's icon color and
 * background. @capacitor/status-bar only controls the status bar; this is
 * Sonora's own minimal plugin for the navigation bar, called alongside it
 * from syncStatusBar() in app.js whenever the in-app theme changes.
 */
@CapacitorPlugin(name = "ThemeBars")
public class ThemeBarsPlugin extends Plugin {

    @PluginMethod
    public void setLight(final PluginCall call) {
        final boolean light = call.getBoolean("light", true);
        final String colorHex = call.getString("color", light ? "#ffffff" : "#131120");

        getBridge()
            .executeOnMainThread(
                () -> {
                    Window window = getActivity().getWindow();
                    window.setNavigationBarColor(Color.parseColor(colorHex));
                    WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
                    controller.setAppearanceLightNavigationBars(light);
                    call.resolve();
                }
            );
    }
}
