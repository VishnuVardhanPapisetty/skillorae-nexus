from pathlib import Path

import joblib
from ucimlrepo import fetch_ucirepo


ROOT = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    ROOT
    / "ai"
    / "models"
    / "student_outcome_model.joblib"
)


def main():
    print("\n===== NEXUS AI INFERENCE TEST =====")

    package = joblib.load(MODEL_PATH)
    model = package["model"]

    print(f"Model accuracy: {package['accuracy'] * 100:.2f}%")

    print("\nLoading a real student record...")

    dataset = fetch_ucirepo(id=697)

    X = dataset.data.features.copy()

    sample = X.iloc[[0]]

    prediction = model.predict(sample)[0]

    probabilities = model.predict_proba(sample)[0]

    print("\n===== NEXUS AI PREDICTION =====")
    print(f"Predicted outcome: {prediction}")

    print("\nPrediction probabilities:")

    for label, probability in zip(
        model.classes_,
        probabilities,
    ):
        print(
            f"{label}: "
            f"{probability * 100:.2f}%"
        )

    print("\n✅ NEXUS AI INFERENCE TEST PASSED")


if __name__ == "__main__":
    main()
    