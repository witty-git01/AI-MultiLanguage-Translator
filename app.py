from flask import Flask, render_template, request, jsonify
from groq import Groq
from dotenv import load_dotenv
import pdfplumber
import os

app = Flask(__name__)

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/translate", methods=["POST"])
def translate():

    # -------------------------------
    # Inputs
    # -------------------------------

    target_language = request.form.get(
        "target_language",
        "English"
    )

    user_text = request.form.get(
        "user_text",
        ""
    ).strip()

    pdf = request.files.get("pdf_file")

    extracted_text = ""

    # -------------------------------
    # Read PDF
    # -------------------------------

    if pdf and pdf.filename != "":

        try:

            with pdfplumber.open(pdf) as pdf_file:

                for page in pdf_file.pages:

                    text = page.extract_text()

                    if text:
                        extracted_text += text + "\n"

        except Exception:

            return jsonify({

                "success": False,

                "error": "Unable to read PDF."

            })

    # -------------------------------
    # Final Input
    # -------------------------------

    final_text = extracted_text if extracted_text else user_text

    if final_text == "":

        return jsonify({

            "success": False,

            "error": "Please enter text or upload a PDF."

        })

    # -------------------------------
    # AI Request
    # -------------------------------

    completion = client.chat.completions.create(

        model="llama-3.3-70b-versatile",

        temperature=0.2,

        messages=[

            {

                "role": "system",

                "content": """
You are a multilingual document assistant.

Return your answer EXACTLY in this format.

DETECTED LANGUAGE:
<language with flag>

TRANSLATION:
<translated text>

SUMMARY:
<summary>

KEY POINTS:
- point 1
- point 2
- point 3

ACTION ITEMS:
- item 1
- item 2

Do not use markdown.
Do not add extra headings.
Do not explain anything outside this format.
"""

            },

            {

                "role": "user",

                "content": f"""

Analyze this document.

Translate it into {target_language}.

Document:

{final_text}

"""

            }

        ]

    )

    response = completion.choices[0].message.content

    # -------------------------------
    # Parse AI Response
    # -------------------------------

    try:

        detected_language = "Unknown"
        translation = ""
        summary = ""
        key_points = []
        action_items = []

        current = None

        for line in response.split("\n"):

            line = line.strip()

            if not line:
                continue

            upper = line.upper()

            # -------------------------------
            # Detect headings (supports both
            # TRANSLATION:
            # and
            # TRANSLATION: hello
            # -------------------------------

            if upper.startswith("DETECTED LANGUAGE"):

                current = "language"

                parts = line.split(":", 1)

                if len(parts) > 1:
                    detected_language = parts[1].strip()

                continue

            elif upper.startswith("TRANSLATION"):

                current = "translation"

                parts = line.split(":", 1)

                if len(parts) > 1:
                    translation = parts[1].strip()

                continue

            elif upper.startswith("SUMMARY"):

                current = "summary"

                parts = line.split(":", 1)

                if len(parts) > 1:
                    summary = parts[1].strip()

                continue

            elif upper.startswith("KEY POINTS"):

                current = "keypoints"

                continue

            elif upper.startswith("ACTION ITEMS"):

                current = "actions"

                continue

            # -------------------------------
            # Read content
            # -------------------------------

            if current == "translation":

                if translation:
                    translation += "\n"

                translation += line

            elif current == "summary":

                if summary:
                    summary += "\n"

                summary += line

            elif current == "keypoints":

                line = line.lstrip("-• ").strip()

                if line:
                    key_points.append(line)

            elif current == "actions":

                line = line.lstrip("-• ").strip()

                if line:
                    action_items.append(line)

    except Exception as e:

        print(e)
        print(response)

        return jsonify({

            "success": False,

            "error": "Unable to process AI response."

        })

    # -------------------------------
    # Return JSON
    # -------------------------------

    return jsonify({

        "success": True,

        "detected_language": detected_language,

        "translation": translation,

        "summary": summary,

        "key_points": key_points,

        "action_items": action_items

    })


if __name__ == "__main__":
    app.run(debug=True)
