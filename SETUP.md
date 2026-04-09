# Legal RAG Chatbot — Setup Guide

## What this app does
A chatbot for a law firm where users ask legal questions answered from uploaded documents (PDFs, Word files, websites). Uses Vertex AI RAG Engine for document retrieval and Gemini for generation.

- **`/`** — chat interface for users
- **`/admin`** — document management (admin only — upload files, add websites, delete documents)

---

## Architecture
- **Frontend**: React + Vite + Tailwind CSS → Firebase Hosting
- **Backend**: Firebase Cloud Functions v2 (Node 22, europe-west1)
- **RAG**: Vertex AI RAG Engine (europe-southwest1) — handles chunking, embedding, retrieval
- **Storage**: Firebase Storage — stores uploaded files
- **Database**: Firestore — stores document metadata
- **LLM**: Gemini 2.5 Flash via Vertex AI

---

## Prerequisites

- Node.js v22+
- A **personal Gmail account** (NOT a Google Workspace/org account — see Step 2)
- Credit card for Firebase Blaze plan (free tier is generous, charges only on excess usage)

Install CLIs:
```bash
npm install -g firebase-tools
```

For gcloud CLI: https://cloud.google.com/sdk/docs/install

Authenticate:
```bash
gcloud auth login
firebase login
```

---

## Step 1 — Get the code

```bash
git clone <repo-url>
cd firebase-test
npm install
cd functions && npm install && cd ..
```

---

## Step 2 — Create a Firebase project (outside any organization)

1. Go to https://console.cloud.google.com/projectcreate
2. In the **Location** field click **Browse** → select **"No organization"** ← critical
3. Give it a name → **Create**
4. Go to https://console.firebase.google.com → **Add project** → select the project you just created

> **Why no organization?** Google Workspace org policies block Cloud Build service accounts, preventing function deployment. Personal projects don't have this restriction.

---

## Step 3 — Enable required Google Cloud APIs

Replace `YOUR_PROJECT_ID` with your project ID:

```bash
gcloud config set project YOUR_PROJECT_ID

gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable eventarc.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable generativelanguage.googleapis.com
```

---

## Step 4 — Grant IAM permissions

Replace `PROJECT_NUMBER` with your project number (found in Cloud Console → project settings):

```bash
# Cloud Build service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/cloudbuild.builds.builder"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/storage.objectAdmin"

# Compute default service account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/cloudbuild.builds.builder"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/cloudfunctions.developer"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/storage.objectAdmin"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/logging.logWriter"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/datastore.user"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/aiplatform.user"
```

---

## Step 5 — Enable Firebase services in the console

### Firestore
1. Firebase Console → **Firestore Database** → **Create database**
2. Select **Production mode**
3. Choose region (e.g. `europe-west1`)
4. ⚠️ Must be **Native mode** — Firebase Console always creates Native mode by default

### Storage
1. Firebase Console → **Storage** → **Get started**
2. Choose the **same region** as Firestore (e.g. `europe-west1`)

### Hosting
1. Firebase Console → **Hosting** → **Get started** → follow the steps

### Upgrade to Blaze plan
Firebase Console → click **Spark** badge (bottom left) → **Upgrade to Blaze**

---

## Step 6 — Create the Vertex AI RAG Engine corpus

1. Go to https://console.cloud.google.com/vertex-ai/rag
2. Select region **europe-southwest1 (Madrid)** — this is where RAG Engine with managed vector DB is available
3. Click **Create corpus**
4. Give it a name (e.g. `legal-rag`)
5. For embedding model choose **text-multilingual-embedding-002** (supports Spanish and other languages)
6. Click **Create**

Get the corpus resource name:
```bash
curl -X GET \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://europe-southwest1-aiplatform.googleapis.com/v1beta1/projects/YOUR_PROJECT_ID/locations/europe-southwest1/ragCorpora"
```

Copy the `name` field (e.g. `projects/YOUR_PROJECT_ID/locations/europe-southwest1/ragCorpora/1234567890`).

---

## Step 7 — Grant Vertex AI service agent access to Storage

Create the Vertex AI service agent:
```bash
gcloud beta services identity create --service=aiplatform.googleapis.com --project=YOUR_PROJECT_ID
```

Grant it access to your Storage bucket (replace `YOUR_PROJECT_ID`):
```bash
gcloud storage buckets add-iam-policy-binding gs://YOUR_PROJECT_ID.firebasestorage.app --member="serviceAccount:service-PROJECT_NUMBER@gcp-sa-aiplatform.iam.gserviceaccount.com" --role="roles/storage.objectViewer"
```

Allow Cloud Run functions to invoke each other:
```bash
gcloud run services add-iam-policy-binding chat --region=europe-west1 --member="allUsers" --role="roles/run.invoker"
gcloud run services add-iam-policy-binding addwebsite --region=europe-west1 --member="allUsers" --role="roles/run.invoker"
gcloud run services add-iam-policy-binding listdocuments --region=europe-west1 --member="allUsers" --role="roles/run.invoker"
gcloud run services add-iam-policy-binding deletedocument --region=europe-west1 --member="allUsers" --role="roles/run.invoker"
```

> Note: Cloud Run service names are lowercase (`addwebsite`, not `addWebsite`).

---

## Step 8 — Configure environment variables

### `.firebaserc`
```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID"
  }
}
```

### Firebase web app config
Firebase Console → **Project Settings** → scroll to **Your apps** → **Add app** → Web (`</>`) → register → copy config values.

### `.env` (root — frontend)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### `functions/.env` (backend)
```
RAG_LOCATION=europe-southwest1
RAG_CORPUS_NAME=projects/YOUR_PROJECT_ID/locations/europe-southwest1/ragCorpora/YOUR_CORPUS_ID
```

---

## Step 9 — Deploy

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Build frontend
npm run build

# Build and deploy functions
cd functions && npm run build && cd ..
firebase deploy --only functions

# Deploy hosting
firebase deploy --only hosting
```

After functions deploy, grant Cloud Run invoker access (Step 7 — run those `gcloud run` commands).

---

## Step 10 — Using the app

- Go to `https://YOUR_PROJECT_ID.web.app/admin` → upload a PDF or Word file, or add a website URL
- Wait ~30 seconds for the document to be imported into the RAG corpus
- Go to `https://YOUR_PROJECT_ID.web.app` → ask questions

---

## Troubleshooting

**"No organization" not available when creating project**
You may have reached your project quota. Delete unused projects at https://console.cloud.google.com/cloud-resource-manager then try again immediately.

**"Datastore mode" error on Firestore**
Your Firestore was created in Datastore mode. Delete and recreate from Firebase Console (always creates Native mode).

**"Function cannot listen to bucket in region X"**
The `REGION` in `functions/src/index.ts` must match your Firebase Storage bucket region.

**"Changing from HTTPS function to background triggered function"**
Delete the old function first:
```bash
firebase functions:delete processDocument --region YOUR_REGION
```

**"Build failed — missing permission on build service account"**
Either IAM permissions from Step 4 weren't applied, or the project is under a Google organization. Create a new project with **No organization** (Step 2).

**"Publisher Model not found" for Gemini**
The model is not available in your RAG Engine region. List available models:
```bash
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://europe-southwest1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/europe-southwest1/publishers/google/models" 2>/dev/null | grep '"name"'
```
Use a model from that list in `functions/src/query.ts`. **gemini-2.5-flash** works in `europe-southwest1`.

**403 on Cloud Run functions**
Run the `gcloud run services add-iam-policy-binding` commands from Step 7 after each deploy.

**"Index currently building"**
Firestore vector indexes take 5-10 minutes to build. Check status in Firebase Console → Firestore → Indexes.
