# MongoDB Installation Guide

It seems **MongoDB is not installed** on your system (or not found in the standard location). 
You need the specialized database software to store your library data. `npm install mongoose` only installs the *driver*, not the database itself.

## Step 1: Download
1. Go to the [MongoDB Community Download Page](https://www.mongodb.com/try/download/community).
2. Select:
   - Version: **7.0.x (Current)** (or latest)
   - Platform: **Windows**
   - Package: **msi**
3. Click **Download**.

## Step 2: Install
1. Run the `.msi` file.
2. Click **Next** -> **Accept Terms**.
3. Choose **Complete** Setup.
4. **IMPORTANT**: Ensure "Install MongoDB as a Service" is CHECKED.
   - This makes it run automatically in the background.
5. Uncheck "Install MongoDB Compass" (optional, but saves time if download is slow).
6. Click **Install**.

## Step 3: Verify & Run
1. Open a new Command Prompt or PowerShell.
2. Type:
   ```cmd
   mongod --version
   ```
   If you see a version number, you are good!

### If "mongod" is not recognized:
You need to add it to your PATH manually, **OR** just manually start it for this project:
1. Create a folder `C:\data\db` (MongoDB needs this).
   ```cmd
   mkdir C:\data\db
   ```
2. Find where you installed it (usually `C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe`).
3. Run it directly:
   ```cmd
   "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
   ```

## Step 4: Restart Project
1. Go back to your project terminal.
2. Press `Ctrl + C` to stop the server (if running).
3. Run `npm start` again.
4. You should see `MongoDB Connected` in the terminal.
