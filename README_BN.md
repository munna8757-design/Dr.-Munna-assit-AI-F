# Dr. Munna Assist AI — Backend-connected Recovery Project

এটি মূল APK থেকে উদ্ধার করা ওয়েব UI/ছবি এবং উন্নত Node.js backend দিয়ে তৈরি একটি পুনর্গঠন প্রজেক্ট। এটি এখনও **সফল Android build বা ফোনে runtime test-এর প্রমাণ নয়**। Backend source যোগ ও syntax-check করা হয়েছে; লাইভ AI চালাতে hosting এবং API credentials প্রয়োজন।

## এই সংস্করণে যোগ/সংশোধন
- `backend/`-এ Gemini chat endpoint; optional recent chat history গ্রহণ করে।
- `backend/`-এ Gemini image-generation endpoint; UI-এর `imageBase64` ও `mimeType` response format অনুসরণ করে।
- Veo video-generation job শুরু ও operation status endpoint। ভিডিও তৈরিতে Google API access/quota/billing প্রয়োজন হতে পারে।
- Health check-এ chat/image/video model ও configuration status।
- Bearer-token authentication, request size limits, rate limit, security headers, restricted video-operation path validation।
- Dockerfile এবং Render deploy blueprint (`render.yaml`)।
- Chat backend সংযোগ ব্যর্থ হলে নীরবে local canned response দেখানোর বদলে backend URL/token সেট করার বার্তা।
- API key APK বা public repository-তে রাখা হয়নি।

## অনলাইন AI backend চালু করার ধাপ
1. ZIP extract করে GitHub repository-তে সব ফাইল push করুন।
2. Render-এ **New → Blueprint** বেছে repository connect করুন। `render.yaml` থেকে backend service তৈরি হবে। অন্য host ব্যবহার করলে `backend/Dockerfile` ব্যবহার করুন।
3. Hosting dashboard-এ `GOOGLE_API_KEY` secret হিসেবে সেট করুন। Google AI Studio থেকে Gemini API key নিতে হবে। **কখনো GitHub-এ commit করবেন না, APK-তে রাখবেন না, এই chat-এ পাঠাবেন না।**
4. `APP_API_TOKEN` hosting-এ auto-generated হবে (নিজে সেট করলে অন্তত 32 random characters ব্যবহার করুন)। Token গোপন রাখুন।
5. Deploy complete হলে `https://YOUR-SERVICE/health` খুলুন। `ok: true`, `aiConfigured: true`, `tokenConfigured: true` দেখা উচিত। এটি শুধু configuration যাচাই করে; API quota/billing নিশ্চিত করে না।
6. Android app → Settings → AI Backend-এ `https://YOUR-SERVICE` এবং একই `APP_API_TOKEN` দিন। Save/Connection Check করুন। URL-এ `/api` যোগ করবেন না; backend সরাসরি `/health`, `/chat`, `/image`, `/video` route দেয়।
7. প্রথমে chat পরীক্ষা করুন। তারপর image। Video asynchronous: job start হওয়ার পর status বারবার check করতে হয়; provider access/credit লাগতে পারে।

## Backend auto-deploy (Render + GitHub Actions)
- প্রথমবার Render dashboard-এ **New → Blueprint** থেকে repository connect করে `render.yaml` apply করুন এবং `GOOGLE_API_KEY` secret সেট করুন।
- `backend/README_BN.md`-এ সম্পূর্ণ ধাপ আছে।
- ঐচ্ছিক automatic redeploy-এর জন্য Render service-এর Deploy Hook URL নিয়ে GitHub repository secret `RENDER_DEPLOY_HOOK_URL` হিসেবে সংরক্ষণ করুন। তারপর `backend/` বা `render.yaml`-এ `main` branch-এ push হলে `.github/workflows/deploy-backend-render.yml` deploy trigger করবে।
- **এই ZIP নিজে থেকে live server deploy করেনি**; আপনার GitHub/Render account-এ প্রথম setup ও secrets দরকার।

## Android APK build
GitHub → Actions → **Build Android APK** → Run workflow। সফল হলে run-এর Artifacts থেকে `Dr-Munna-Assist-AI-debug-apk` ডাউনলোড করুন। Debug APK install করার জন্য Android-এর install-unknown-apps permission লাগতে পারে। Workflow সফল না হলে build log-ই আসল diagnosis; APK build হয়েছে ধরে নেবেন না।

## ফিচার সীমাবদ্ধতা
- Chat: Gemini API key ও active service প্রয়োজন।
- Image: `gemini-2.5-flash-image` model/API access প্রয়োজন; provider access/limits account অনুযায়ী বদলাতে পারে।
- Video: Veo API access/quota/billing প্রয়োজন; operation শুরু হলেই ভিডিও তৈরি সম্পন্ন হয় না। এই UI-তে returned video URL প্রদর্শনের অভিজ্ঞতা এখনও ফোনে যাচাই করা হয়নি।
- Voice: Android WebView, browser speech recognition এবং device text-to-speech service-এর ওপর নির্ভরশীল।
- Avatar: উদ্ধার করা assets মূলত outfit/anatomy ছবি; প্রকৃত rigged 3D human avatar বা motion capture প্রমাণিত নয়।
- Offline mode: সীমিত local demo/স্থির উত্তর; offline full generative AI নয়।

## নিরাপত্তা ও ব্যবহার
Medical information educational support only; diagnosis বা emergency care-এর বিকল্প নয়। Production ব্যবহারের আগে privacy policy, data retention, billing limits, logging redaction, uptime monitoring এবং access control পর্যালোচনা করুন।


## Render Backend — সংশোধিত Deploy নির্দেশনা

1. GitHub repository-র root-এ `render.yaml` এবং `backend/` ফোল্ডার আছে কি না নিশ্চিত করুন।
2. Render Dashboard → **New → Blueprint** → repository নির্বাচন করুন। Blueprint-এ `runtime: node`, `rootDir: backend`, `npm install` এবং `npm start` ব্যবহার করা হয়েছে।
3. Render-এ `APP_API_TOKEN` স্বয়ংক্রিয়ভাবে তৈরি হবে। `GOOGLE_API_KEY`-এর জন্য নিজের Gemini API key Render-এর Environment settings-এ যোগ করুন; key কখনো APK বা GitHub-এ রাখবেন না।
4. Deploy সফল হলে `https://আপনার-render-service.onrender.com/health` খুলুন। JSON-এ `ok: true`, `tokenConfigured: true`, `aiConfigured: true` থাকা উচিত। `aiConfigured: false` হলে API key যোগ হয়নি।
5. Android অ্যাপে Settings → AI Backend-এ সম্পূর্ণ HTTPS service URL (শেষে `/api` যোগ করবেন না) এবং Render-এর `APP_API_TOKEN` বসান। Save করে Connection Check করুন। সরাসরি Backend URL ব্যবহার করলে অ্যাপ নিজে `/health`, `/chat`, `/image`, `/video` paths যোগ করবে।
6. GitHub Actions-এর `RENDER_DEPLOY_HOOK_URL` optional. Render-এ repository Auto-Deploy চালু থাকলে push-এ Render নিজেই deploy করবে।

**গুরুত্বপূর্ণ:** Render service তৈরি, Gemini key যোগ, provider quota/model access, এবং live endpoint পরীক্ষা না করা পর্যন্ত Backend-কে live/সম্পূর্ণ কার্যকর বলা যাবে না। Gemini image/video endpoints-এর ব্যবহার আপনার Google API access ও billing/availability-এর উপর নির্ভর করে।


## আপডেটেড build নোট
- GitHub Actions workflow-এ APK build-এর আগে backend JavaScript syntax check যোগ করা হয়েছে এবং Gradle no-daemon build ব্যবহার করা হয়েছে।
- এটি build pipeline-এর উন্নতি; এই ZIP থেকে APK সফলভাবে তৈরি হয়েছে বা সব feature ফোনে কাজ করছে—এমন দাবি নয়।
- Online chat/image/video চালাতে Render backend deploy, Google API key এবং app Settings-এ backend URL/token প্রয়োজন। Video feature provider access/quota/billing-এর উপর নির্ভরশীল।
- এই UI-তে থাকা avatar/anatomy asset ছবি; সম্পূর্ণ animated rigged 3D human avatar বা পূর্ণ offline generative AI অন্তর্ভুক্ত নয়।

## APK Build (updated)
The workflow `.github/workflows/android-apk.yml` validates project files, checks backend syntax, installs Android SDK packages, generates the Capacitor Android project, builds `assembleDebug`, verifies the APK, and uploads it as `Dr-Munna-Assist-AI-debug-apk`. Run it from GitHub Actions and download the artifact from a successful run. The ZIP itself does not contain a prebuilt APK.

**সীমাবদ্ধতা:** APK build সফল হলেই অনলাইন AI, ছবি/ভিডিও তৈরি, ভয়েস, 3D avatar বা anatomy সব কাজ করবে—এমন নয়। অনলাইন AI-এর জন্য backend deploy, API key, model access এবং quota/billing লাগবে। এই প্রজেক্টে সম্পূর্ণ offline generative AI বা পূর্ণ rigged 3D avatar নিশ্চিতভাবে অন্তর্ভুক্ত নেই।
