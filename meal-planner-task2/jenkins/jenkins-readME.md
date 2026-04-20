

## Jenkins CI/CD Setup  


### File Structure 

```
meal-planner-task2/
├── backend/               
├── terraform/
│   └── main.tf           
├── jenkins/
│   └── docker-compose.yaml              
└── Jenkinsfile          
```

---

## Step 1 — Jenkins via Docker

Create `jenkins/docker-compose.yaml`:

```yaml
services:
  jenkins:
    image: jenkins/jenkins:lts
    container_name: jenkins
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped

volumes:
  jenkins_home:
```

Start it:

```bash
cd jenkins
docker compose up -d
```

Access Jenkins at `http://localhost:8080`

---

## Step 2 — Jenkins Initial Setup

1. Get the unlock password:
```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```
2. Open `http://localhost:8080` → paste the password
3. Choose **"Install suggested plugins"**
4. Also install manually:  go to http://localhost:8080 --> top right gear icon  **Manage Jenkins** --> Click  **Plugins** --> Click  **Available plugins**  tab --> select them and install. 
   - `Docker Pipeline`
   - `Pipeline: Stage View`

---

## Step 3 — Install Terraform and node in Jenkins Container

```bash
docker exec -u root jenkins bash -c "
  apt-get update && apt-get install -y wget unzip &&
  wget https://releases.hashicorp.com/terraform/1.7.5/terraform_1.7.5_linux_amd64.zip &&
  unzip terraform_1.7.5_linux_amd64.zip -d /usr/local/bin/ &&
  rm terraform_1.7.5_linux_amd64.zip
"

```


```bash
docker exec -u root jenkins bash -c "apt-get update && apt-get install -y curl && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs"

# checking if installed
docker exec jenkins node --version
docker exec jenkins npm --version
```
---

## Step 4 — Add AWS Credentials and environment vars to Jenkins

1. Manage Jenkins → Credentials → Global → Add Credential
2. Add two **"Secret text"** credentials:

| ID | Value |
|----|-------|
| `aws-access-key-id` | Your AWS Access Key |
| `aws-secret-access-key` | Your AWS Secret Key |
3. Then add all 5 required environment variables as credentials in the same manner with `TF_VAR_` prefix.

---


## Step 5 — Create Jenkins Pipeline Job in UI


### Phase 1: Credentials Setup
Before creating the job, ensure Jenkins can communicate with GitHub.

### 1. Generate GitHub Personal Access Token (PAT)
If you do not have a token:
1. Go to **GitHub Settings** > **Developer settings**.
2. **Personal access tokens** > **Tokens (classic)** > **Generate new token**.
3. Select the `repo` scope (full control).
4. **Copy the token immediately**; it will not be shown again.

### 2. Add Credentials to Jenkins
1. Navigate to **Manage Jenkins** > **Credentials**.
2. Click **System** > **Global credentials**.
3. Click **Add Credentials** and fill in:
   - **Kind:** Username with password
   - **Username:** Your GitHub username
   - **Password:** Your GitHub PAT (Personal Access Token)
   - **ID:** `github-credentials`
   - **Description:** `GitHub`
4. Click **Create**.



### Phase 2: Create and Configure Jenkins Job

### 1. Create the Job
1. Click **New Item** on the Jenkins dashboard.
2. Enter name 
3. Select **Pipeline** and click **OK**.

### 2. General Settings
- Check **Do not allow concurrent builds** (ensures only one deployment runs at a time).

### 3. Pipeline Section
- **Definition:** Pipeline script from SCM
- **SCM:** Git
- **Repository URL:**  https://github.com/rifat-craftsmen/rifat.sde
- **Credentials:** Select `github-credentials`
- **Branch Specifier:** `*/t2-iter1-b15`
- **Script Path:** `meal-planner-task2/Jenkinsfile`



### Phase 3: Run the Deployment
1. Click **Save**.
2. Click **Build Now**.
3. Click the **Build Number** > **Console Output** to monitor progress.
4. **Manual Gate:** The pipeline will pause at the **Approval** stage. You must manually click **Proceed** in the Jenkins UI before `terraform apply` executes.


---