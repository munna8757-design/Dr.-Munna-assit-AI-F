# Dr. Munna Assist AI — Project status and limitations

## Included in this project archive
- Existing web UI bundle and bundled avatar/anatomy image assets.
- Capacitor configuration to package the web UI as an Android application.
- GitHub Actions workflow that validates key files, checks backend JavaScript syntax, creates the Android project, builds a debug APK, verifies the APK exists, and uploads it as an artifact.
- Express backend endpoints for text chat, image generation, video-generation job creation, and video job status polling.
- Render deployment blueprint and environment-variable example.

## Important: what is and is not verified
- Static JSON and JavaScript syntax can be checked locally; the GitHub workflow is designed to perform the Android SDK/Gradle build in GitHub-hosted CI.
- An APK is not included in this ZIP. Download it from the successful GitHub Actions run's Artifacts section after the workflow finishes.
- A successful build does not prove every UI control works on a physical phone.
- No real Google API key, live hosting account, or billing/quota access is included. Chat/image/video generation will not work until the backend is deployed and configured with a valid provider key and access.
- The existing bundled avatar/anatomy assets do not by themselves constitute a rigged, animated 3D human or a complete interactive 3D anatomy system.
- Offline generative AI is not included. The AI provider features require internet access.
- Speech input/output depends on the UI implementation, browser/WebView support, and device permissions; test on the target phone.

## Required setup for online AI
1. Deploy the `backend` directory using `render.yaml` or another Node.js host.
2. Configure `GOOGLE_API_KEY` and a long random `APP_API_TOKEN` as host environment secrets. Never commit the Google API key.
3. Copy the deployed HTTPS backend URL into the app's AI Backend settings and enter the matching app token, if the UI offers those settings.
4. Open the backend `/health` endpoint. It reports configuration only, not proof that model access, quota, or billing works.
5. Test chat, image, and video generation separately; model availability and pricing depend on the provider account.

## Build APK using GitHub Actions
1. Upload the contents of this project folder to the root of your repository's `main` branch. Keep `.github/workflows/android-apk.yml` in that exact path.
2. Open the repository's **Actions** tab and choose **Build Android APK**.
3. Select **Run workflow** (or push a commit to `main`).
4. Open the newest run. If it is green, scroll to **Artifacts** and download `Dr-Munna-Assist-AI-debug-apk`.
5. Extract the downloaded artifact ZIP and install `app-debug.apk` on an Android phone. Android may ask permission to install unknown apps.
6. If the run fails, open the failed step and inspect its log. A green backend syntax check alone is not an APK build.

## Safety and production readiness
The debug APK is for testing, not a signed production release. Before public distribution, use a signed release build, protect the backend against abuse, apply quotas, verify privacy disclosures, and test on physical devices. A bearer token embedded in a mobile client is extractable; do not treat it as a secret strong enough to protect an unrestricted public AI endpoint.
