from pathlib import Path

import joblib
import pandas as pd
from ucimlrepo import fetch_ucirepo

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = ROOT / "ai" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "student_outcome_model.joblib"


def main():
    print("\n===== NEXUS AI TRAINING =====")
    print("Downloading student dataset...")

    dataset = fetch_ucirepo(id=697)

    X = dataset.data.features.copy()
    y = dataset.data.targets.iloc[:, 0].copy()

    X = X.replace([float("inf"), float("-inf")], pd.NA)

    numeric_columns = X.select_dtypes(
        include=["number"]
    ).columns.tolist()

    categorical_columns = [
        column
        for column in X.columns
        if column not in numeric_columns
    ]

    preprocessing = ColumnTransformer(
        transformers=[
            (
                "numeric",
                "passthrough",
                numeric_columns,
            ),
            (
                "categorical",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
                categorical_columns,
            ),
        ]
    )

    model = Pipeline(
        steps=[
            ("preprocessing", preprocessing),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=200,
                    random_state=42,
                    class_weight="balanced",
                    n_jobs=-1,
                ),
            ),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    print(f"Total students: {len(X)}")
    print(f"Training records: {len(X_train)}")
    print(f"Testing records: {len(X_test)}")

    print("\nTraining NEXUS AI model...")

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    print("\n===== MODEL EVALUATION =====")
    print(f"Test Accuracy: {accuracy * 100:.2f}%")

    print("\nClassification Report:")
    print(
        classification_report(
            y_test,
            predictions,
            zero_division=0,
        )
    )

    joblib.dump(
        {
            "model": model,
            "feature_columns": X.columns.tolist(),
            "target_classes": model.classes_.tolist(),
            "accuracy": float(accuracy),
            "dataset_id": 697,
        },
        MODEL_PATH,
    )

    print("\n===== MODEL SAVED =====")
    print(f"Location: {MODEL_PATH}")

    print("\n✅ NEXUS AI TRAINING COMPLETED")


if __name__ == "__main__":
    main()