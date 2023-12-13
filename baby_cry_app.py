import speech_recognition as sr
import numpy as np
import pandas as pd

# Carica il modello
# model = pd.read_csv("baby_cry_model.csv")
model = pd.read_csv("gs://my-bucket/baby_cry_model.csv")

# Crea il classificatore
classifier = LogisticRegression(solver="liblinear")
classifier.fit(model.drop("category", axis=1), model["category"])

# Crea l'interfaccia utente
def main():
    # Crea un oggetto di riconoscimento vocale
    r = sr.Recognizer()

    # Ascolta il suono del pianto del bambino
    with sr.Microphone() as source:
        r.adjust_for_ambient_noise(source)
        audio = r.listen(source)

    # Trasforma l'audio in un vettore
    x = np.array(audio)

    # Predizici la categoria del pianto
    category = classifier.predict(x.reshape(1, -1))[0]

    # Mostra la categoria del pianto
    print(category)

if __name__ == "__main__":
    main()
