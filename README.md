#  Fraud Detection Dashboard

An interactive web application designed to detect fraudulent credit card transactions. Users can upload a CSV file of transaction data, and the application leverages a pre-trained machine learning model to provide real-time predictions and insightful visualizations.

This project features a modern architecture with a standalone Python (Flask) backend API and a dynamic VITE + JavaScript frontend.

---

##  Screenshot

<img width="1699" height="869" alt="image" src="https://github.com/user-attachments/assets/a180b304-561b-4363-bdb1-7e54db27b54d" />
<img width="1606" height="882" alt="image" src="https://github.com/user-attachments/assets/a718f1dc-4c2d-4a61-8064-906c24f16ebe" />
<img width="821" height="543" alt="image" src="https://github.com/user-attachments/assets/d0d02631-4625-43ab-aeaf-6639f5eb1e9a" />
<img width="1569" height="891" alt="image" src="https://github.com/user-attachments/assets/57b1dd10-8fbb-4c68-bd02-75f465b981ba" />
<img width="1493" height="435" alt="image" src="https://github.com/user-attachments/assets/88650736-d06a-445d-bce7-1d9007b28a8d" />






---

##  Features

* **Real-time Fraud Prediction:** Upload a CSV file and get instant predictions for each transaction.
* **Interactive Dashboard:** All statistics and charts update dynamically without a page refresh.
* **Key Performance Indicators (KPIs):** At-a-glance metrics including:
    * Total Transactions Analyzed
    * Potential Fraud Loss Prevented
    * Counts of Fraudulent & Legitimate Transactions
    * Overall Fraud Rate
* **Data Visualization:**
    * **Prediction Distribution:** A pie chart showing the proportion of fraudulent vs. legitimate transactions.
    * **Confidence Distribution:** A bar chart grouping transactions by the model's confidence score.
    * **Fraud Rate Trend:** A line chart that displays the fraud rate over time (if a 'Time' column is present).
* **Detailed Analysis:**
    * A full, searchable table of all transactions with their predictions.
    * A summary table highlighting the **Top 5 High-Risk Transactions**.
* **Downloadable Reports:** Export the complete results, including predictions and confidence scores, as a new CSV file.
* **Responsive Design:** A clean, modern UI that works on various screen sizes.
* **Dark / Light Mode:** A theme toggle for user comfort.

---

##  Tech Stack

* **Backend:**
    * **Python 3**
    * **Flask:** For the web server and API endpoint.
    * **Pandas:** For efficient data manipulation.
    * **Scikit-learn:** For loading and using the pre-trained machine learning model.
* **Frontend:**
    * **HTML5**
    * **CSS3:** Custom properties for easy theming (no frameworks).
    * **Vite :** Modular, class-based structure for managing the UI, charts, and API calls.
* **Charting:**
    * **Chart.js:** For creating dynamic and responsive charts.

---

##  Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

You need to have the following software installed:
* [Python 3.8+](https://www.python.org/downloads/) and `pip`
* [Node.js and npm](https://nodejs.org/en/download/)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git)
    cd YOUR_REPOSITORY_NAME
    ```

2.  **Set up the Python Backend:**
    * Navigate to the backend directory:
        ```sh
        cd python-backend
        ```
    * Create and activate a virtual environment (recommended):
        ```sh
        # For Mac/Linux
        python3 -m venv venv
        source venv/bin/activate

        # For Windows
        python -m venv venv
        .\venv\Scripts\activate
        ```
    * Install the required Python packages:
        ```sh
        pip install -r requirements.txt
        ```
        *(If you don't have a `requirements.txt` file, create one with `Flask`, `Flask-Cors`, `pandas`, `scikit-learn`, and `joblib`)*

3.  **Set up the JavaScript Frontend:**
    * Navigate back to the root project directory:
        ```sh
        cd ..
        ```
    * Install the npm packages (this will install development tools like Vite):
        ```sh
        npm install
        ```

### Running the Application

You need to run both the backend and frontend servers simultaneously in two separate terminals.

1.  **Start the Backend Server:**
    * In your first terminal, from the `python-backend` directory:
        ```sh
        python app.py
        ```
    * The backend will be running at `http://127.0.0.1:5000`.

2.  **Start the Frontend Server:**
    * In your second terminal, from the **root project directory**:
        ```sh
        npm run dev
        ```
    * The frontend development server will start, typically at `http://localhost:5173` (Vite's default).

---

## Usage

1.  Open the frontend URL provided by the `npm run dev` command in your browser.
2.  Drag and drop a CSV file with transaction data onto the upload area, or click to select a file.
3.  The dashboard will automatically update with predictions and visualizations based on your data.
4.  Interact with the charts, review the transaction tables, and click the "Download Predictions" button to get your results.

---

##  License

Distributed under the MIT License. See `LICENSE` for more information.
