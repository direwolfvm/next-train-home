# Cloud Run Deployment

## One-time setup

### 1. Enable required APIs
```bash
gcloud services enable \
  secretmanager.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Store the API key in Secret Manager
```bash
printf "YOUR_WMATA_PRIMARY_API_KEY" | gcloud secrets create WMATA_PRIMARY_API_KEY \
  --data-file=- \
  --replication-policy=automatic
```

### 3. Grant the Cloud Run service account access to the secret

Cloud Run uses the default Compute Engine service account unless you specify otherwise.
```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding WMATA_PRIMARY_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Also grant Cloud Build's service account the same, so it can access the secret during deployment:
```bash
gcloud secrets add-iam-policy-binding WMATA_PRIMARY_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Continuous deployment from GitHub (no cloudbuild.yaml required)

In the **Cloud Run console**:

1. **Create service** → "Continuously deploy from a repository"
2. Connect your GitHub repo and select the branch (`main`)
3. Set **Build type** → **Dockerfile** (Cloud Run detects it automatically)
4. Under **Container, Volumes, Networking, Security**:
   - **Secrets** → Add `WMATA_PRIMARY_API_KEY` → Reference secret version `latest` → expose as **environment variable** named `WMATA_PRIMARY_API_KEY`
   - Memory: 512 MiB, CPU: 1
   - Port: 3000 (or leave as 8080 — Cloud Run injects `PORT` and Next.js reads it automatically)
5. **Allow unauthenticated invocations** if this is a public display
6. Click **Create**

Cloud Run sets up the Cloud Build trigger for you. Every push to `main` builds the Dockerfile and deploys a new revision automatically.

---

## Updating the secret value
```bash
printf "NEW_KEY_VALUE" | gcloud secrets versions add WMATA_PRIMARY_API_KEY --data-file=-
```
Cloud Run picks up `:latest` on the next request (no redeploy needed for secret rotation).

## Checking logs
```bash
gcloud run services logs read next-train-home --region=YOUR_REGION --limit=50
```
