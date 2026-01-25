# System See

System See is a tool to monitor the C: drive for file changes. It scans the drive, saves the state to a database, and allows you to compare the current state with the previous one to detect new, modified, or deleted files.

## Installation

1.  Ensure you have Python installed.
2.  Install dependencies:
    ```bash
    pip install flask
    ```

## Running the Server

1.  Navigate to the project directory:
    ```bash
    cd v:\git\test1\system_see
    ```
2.  Run the application:
    ```bash
    python app.py
    ```
3.  Open your browser and go to:
    [http://127.0.0.1:5000](http://127.0.0.1:5000)

## Stopping the Server

- **From the Interface**: Click the "Stop Server" button in the web interface.
- **From Terminal**: Press `CTRL+C` in the terminal window where the server is running.

## Usage

1.  Click **Scan Drive C:** to start a scan.
2.  Wait for the scan to complete (it may take a few minutes).
3.  Perform file operations (create/delete files).
4.  Scan again to view the differences.
