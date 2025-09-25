import warnings
from sklearn.exceptions import InconsistentVersionWarning

# Ignore InconsistentVersionWarning for compatibility
warnings.filterwarnings("ignore", category=InconsistentVersionWarning)

import dash
from dash import dcc, html, Input, Output, dash_table
from flask import request, make_response
import numpy as np
import pandas as pd
import joblib
import base64
import io
import os
import plotly.graph_objs as go
import plotly.express as px
from sklearn.metrics import roc_curve, confusion_matrix

# Initialize the Dash app
app = dash.Dash(__name__)

# --- Model and Asset Loading ---
# Adjust the path to be robust, for example, on a server like PythonAnywhere
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Define paths to your model, scaler, and feature names
model_path = os.path.join(BASE_DIR, 'static', 'saved_model.pkl')
scaler_path = os.path.join(BASE_DIR, 'static', 'scaler.pkl')
feature_names_path = os.path.join(BASE_DIR, 'static', 'feature_names.pkl')

# Load the trained model, scaler, and expected feature names
model = joblib.load(model_path)
scaler = joblib.load(scaler_path)
expected_columns = joblib.load(feature_names_path)

# --- Styling and Colors ---
colors = {
    'background': '#f8f9fa',
    'text': '#2c3e50',
    'accent': '#3498db',
    'error': '#e74c3c'
}

# --- App Layout ---
app.layout = html.Div(style={'fontFamily': 'Arial', 'backgroundColor': colors['background'], 'padding': '20px'}, children=[
    html.H1('Fraud Detection Dashboard', style={'textAlign': 'center', 'color': colors['text']}),

    dcc.Markdown('''
        ### Welcome to the Fraud Detection Dashboard
        This tool allows you to upload transaction data and check for potentially fraudulent activity using a trained model.
        
        **Instructions:**
        - **Upload a CSV file with transaction data.**
        - **The model will analyze the data and provide predictions.**
        - **Visualizations will help you interpret the results.**
        
        **Understanding the Results:**
        - **Confidence Levels**: Each prediction includes a confidence score. Higher scores indicate a higher likelihood of fraud.
        - **Fraudulent**: Transactions predicted as potentially fraudulent should be reviewed carefully.
        - **Not Fraudulent**: Transactions predicted as not fraudulent are likely legitimate.
    ''', style={'margin': '20px', 'padding': '10px', 'backgroundColor': '#ecf0f1', 'borderRadius': '5px'}),

    dcc.Upload(
        id='upload-data',
        children=html.Div([
            'Drag and Drop or ',
            html.A('Select Files', style={'color': colors['accent']})
        ]),
        style={
            'width': '100%',
            'height': '60px',
            'lineHeight': '60px',
            'borderWidth': '1px',
            'borderStyle': 'dashed',
            'borderRadius': '5px',
            'textAlign': 'center',
            'margin': '10px',
            'backgroundColor': '#ecf0f1',
            'borderColor': colors['accent']
        },
        multiple=False
    ),

    # This Div will be populated by the callback
    html.Div(id='output-data-upload'),
])

# --- Callback for File Processing and Prediction ---
@app.callback(
    Output('output-data-upload', 'children'),
    [Input('upload-data', 'contents')],
)
def update_output(contents):
    if contents is not None:
        content_type, content_string = contents.split(',')
        decoded = base64.b64decode(content_string)
        try:
            df = pd.read_csv(io.StringIO(decoded.decode('utf-8')))
            
            # Preprocessing: Ensure all expected columns are present
            for col in expected_columns:
                if col not in df.columns:
                    df[col] = 0

            # Select only the columns the model was trained on
            X_new = df[expected_columns]
            
            # Scale features using the loaded scaler
            X_new_scaled = scaler.transform(X_new)
            
            # Make predictions
            X_pred = model.predict(X_new_scaled)
            X_pred_proba = model.predict_proba(X_new_scaled)[:, 1]
            
            # Add prediction info to the DataFrame
            df['Prediction'] = X_pred
            df['Prediction_Label'] = ['Not Fraudulent' if p == 0 else 'Potentially Fraudulent' for p in X_pred]
            df['Confidence'] = X_pred_proba
            df['Risk_Level'] = pd.cut(
                X_pred_proba, bins=[-0.01, 0.5, 0.7, 0.9, 1],
                labels=['Safe', 'Low Risk', 'Medium Risk', 'High Risk']
            )

            # --- NEW: Calculate Fraud Loss Saved ---
            fraud_loss_saved = df.loc[df['Prediction'] == 1, 'Amount'].sum()

            # --- NEW: Get Top 5 High Risk Transactions ---
            top_risk = df[df['Prediction'] == 1].sort_values(by='Confidence', ascending=False).head(5)

            # Create Prediction Pie Chart
            labels = ['Not Fraudulent', 'Potentially Fraudulent']
            values = [sum(X_pred == 0), sum(X_pred == 1)]
            pie_chart = dcc.Graph(
                figure=go.Figure(
                    data=[go.Pie(labels=labels, values=values, hole=0.4,
                                 marker=dict(colors=['#2ecc71', '#e74c3c']))],
                    layout=go.Layout(title='Prediction Distribution', title_x=0.5)
                )
            )

            # Assemble the output elements
            elements = [
                html.H2('Prediction Results', style={'color': colors['text']}),
                
                # --- NEW: Display Fraud Loss Saved ---
                html.H4(f'💰 Potential Fraud Loss Prevented: ${fraud_loss_saved:,.2f}', style={'color': '#27ae60'}),

                html.H3('All Transactions:', style={'color': colors['text'], 'marginTop': '20px'}),
                dash_table.DataTable(
                    data=df.to_dict('records'),
                    columns=[{'name': i, 'id': i} for i in df.columns],
                    page_size=10,
                    style_table={'overflowX': 'auto', 'backgroundColor': '#ffffff'},
                    style_header={'backgroundColor': colors['accent'], 'color': 'white'},
                    style_cell={'textAlign': 'center', 'padding': '10px'}
                ),

                # --- NEW: Display Top 5 High Risk Transactions ---
                html.H3('Top 5 High-Risk Transactions:', style={'color': colors['text'], 'marginTop': '30px'}),
                dash_table.DataTable(
                    data=top_risk.to_dict('records'),
                    columns=[{'name': i, 'id': i} for i in top_risk.columns],
                    page_size=5,
                    style_table={'overflowX': 'auto', 'backgroundColor': '#ffffff'},
                    style_header={'backgroundColor': colors['error'], 'color': 'white'},
                    style_cell={'textAlign': 'center', 'padding': '10px'}
                ),

                pie_chart
            ]

            # Optional: ROC & Confusion Matrix if true labels ('Class') exist in the data
            if 'Class' in df.columns:
                cm = confusion_matrix(df['Class'], X_pred)
                confusion_fig = px.imshow(cm, text_auto=True, color_continuous_scale='Blues',
                                          labels={'x': 'Predicted', 'y': 'Actual'},
                                          x=labels, y=labels)
                
                fpr, tpr, _ = roc_curve(df['Class'], X_pred_proba)
                roc_fig = go.Figure()
                roc_fig.add_trace(go.Scatter(x=fpr, y=tpr, mode='lines', name='ROC Curve'))
                roc_fig.add_trace(go.Scatter(x=[0, 1], y=[0, 1], mode='lines', name='Random Classifier', line=dict(dash='dash')))
                roc_fig.update_layout(title='ROC Curve', xaxis_title='False Positive Rate', yaxis_title='True Positive Rate')

                elements.extend([
                    html.H3('Model Performance Metrics', style={'color': colors['text'], 'marginTop': '30px'}),
                    dcc.Graph(figure=roc_fig),
                    dcc.Graph(figure=confusion_fig)
                ])

            # --- NEW: Fraud Rate Trend if 'Time' column exists ---
            if 'Time' in df.columns:
                df['Date'] = pd.to_datetime(df['Time'], unit='s', errors='coerce')
                # Resample by day to get a clearer trend
                trend_df = df.set_index('Date').resample('D')['Prediction'].mean().reset_index()
                
                trend_fig = go.Figure()
                trend_fig.add_trace(go.Scatter(x=trend_df['Date'], y=trend_df['Prediction'], mode='lines+markers', name='Fraud Rate'))
                trend_fig.update_layout(title='Fraud Rate Trend Over Time', xaxis_title='Date', yaxis_title='Daily Fraud Rate')
                
                elements.append(html.H3('Fraud Rate Trend:', style={'color': colors['text'], 'marginTop': '30px'}))
                elements.append(dcc.Graph(figure=trend_fig))

            # --- NEW: Add Download CSV Link ---
            csv_string = df.to_csv(index=False, encoding='utf-8')
            download_href = f"data:text/csv;charset=utf-8,{csv_string}"
            elements.append(
                html.A(
                    '⬇️ Download Predictions CSV',
                    id='download-link',
                    download="predictions.csv",
                    href=download_href,
                    target="_blank",
                    style={'color': colors['accent'], 'fontSize': '18px', 'display': 'block', 'marginTop': '20px'}
                )
            )

            return html.Div(elements)

        except Exception as e:
            # Enhanced Error Handling
            error_message = f'Error details: {str(e)}'
            if 'df' in locals():
                actual_cols = ', '.join(df.columns)
            else:
                actual_cols = 'Unable to read columns from the file.'
                
            return html.Div([
                html.H5('An Error Occurred While Processing the File', style={'color': colors['error']}),
                html.P(error_message),
                html.P('Please ensure the uploaded file is a correctly formatted CSV.'),
                html.P(f'Expected columns include: {", ".join(expected_columns)}'),
                html.P(f'Actual columns found: {actual_cols}')
            ], style={'padding': '20px', 'backgroundColor': '#fdeded', 'border': f'1px solid {colors["error"]}'})

    # Return empty div if no content is uploaded
    return html.Div()


# --- Backend CSV prediction endpoint ---
@app.server.route('/predict_csv', methods=['POST'])
def predict_csv():
    """Accepts a CSV file (form field 'file') and returns a CSV with Prediction and Confidence columns."""
    if 'file' not in request.files:
        return make_response('No file part in the request', 400)

    file = request.files['file']
    if file.filename == '':
        return make_response('No selected file', 400)

    try:
        df = pd.read_csv(file)

        # Ensure all expected columns are present
        for col in expected_columns:
            if col not in df.columns:
                df[col] = 0

        X_new = df[expected_columns]
        X_new_scaled = scaler.transform(X_new)

        preds = model.predict(X_new_scaled)
        proba = model.predict_proba(X_new_scaled)[:, 1]

        df['Prediction'] = preds
        df['Confidence'] = proba

        csv_string = df.to_csv(index=False)
        response = make_response(csv_string)
        response.headers['Content-Disposition'] = 'attachment; filename=predictions.csv'
        response.headers['Content-Type'] = 'text/csv'
        return response
    except Exception as e:
        return make_response(f'Error processing file: {str(e)}', 500)


# --- Run the App ---
if __name__ == '__main__':
    app.run(debug=True)