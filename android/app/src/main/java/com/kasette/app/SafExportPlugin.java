package com.kasette.app;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Lets the user save a file to any destination through Android's Storage
 * Access Framework "Save As" picker — a folder on the phone, an SD card, or
 * a USB drive, if the system exposes one as a document provider.
 * @capacitor/filesystem only writes inside the app's own sandboxed
 * directories, so app.js first writes the backup there, then hands the
 * resulting path to this plugin to copy into wherever the user picks.
 */
@CapacitorPlugin(name = "SafExport")
public class SafExportPlugin extends Plugin {

    @PluginMethod
    public void exportFile(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Missing path");
            return;
        }
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String suggestedName = call.getString("suggestedName", "backup");

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, suggestedName);
        startActivityForResult(call, intent, "onSaveResult");
    }

    @ActivityCallback
    private void onSaveResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("cancelled");
            return;
        }
        Uri destUri = result.getData().getData();
        String srcPath = call.getString("path");
        try {
            ContentResolver resolver = getContext().getContentResolver();
            try (
                InputStream in = new FileInputStream(srcPath);
                OutputStream out = resolver.openOutputStream(destUri)
            ) {
                byte[] buf = new byte[64 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                }
            }
            JSObject ret = new JSObject();
            ret.put("uri", destUri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("write failed: " + e.getMessage());
        }
    }
}
