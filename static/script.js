document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // Elements
  // ==========================

  const overlay = document.getElementById("overlay");
  const popupTitle = document.getElementById("popup-title");
  const popupContent = document.getElementById("popup-content");

  const closeBtn = document.getElementById("close-popup");
  const copyBtn = document.getElementById("copy-btn");

  const cards = document.querySelectorAll(".expandable-card");

  const form = document.querySelector("form");
  const button = document.getElementById("translate-btn");

  const dropArea = document.getElementById("drop-area");
  const fileInput = document.getElementById("pdf-upload");
  const fileName = document.getElementById("file-name");

  // New Elements

  const languageValue = document.getElementById("language-value");

  const translationPreview = document.getElementById("translation-preview");
  const summaryPreview = document.getElementById("summary-preview");
  const keypointsPreview = document.getElementById("keypoints-preview");
  const actionitemsPreview = document.getElementById("actionitems-preview");

  // ==========================
  // Popup
  // ==========================

  function openPopup(title, content) {
    popupTitle.textContent = title;

    popupContent.textContent = content;

    overlay.classList.add("active");

    document.body.style.overflow = "hidden";
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      openPopup(
        card.dataset.title,

        card.dataset.content,
      );
    });
  });

  function closePopup() {
    overlay.classList.remove("active");

    document.body.style.overflow = "auto";
  }

  closeBtn.addEventListener("click", closePopup);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePopup();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopup();
  });

  // ==========================
  // Copy
  // ==========================

  copyBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(popupContent.textContent);

    copyBtn.innerHTML = "✓ Copied";

    setTimeout(() => {
      copyBtn.innerHTML = "📋 Copy";
    }, 1500);
  });

  // ==========================
  // Drag & Drop
  // ==========================

  function updateUploadUI(file) {
    fileName.innerHTML = `📄 ${file.name}<br><br>✅ Ready for Analysis`;

    dropArea.classList.add("uploaded");
  }

  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();

    dropArea.classList.add("dragover");
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
  });

  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();

    dropArea.classList.remove("dragover");

    const files = e.dataTransfer.files;

    if (files.length) {
      fileInput.files = files;

      updateUploadUI(files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (!e.target.files.length) return;

    updateUploadUI(e.target.files[0]);
  });

  // ==========================
  // AJAX Submit
  // ==========================

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    button.disabled = true;

    button.innerHTML = "Analyzing...";

    const formData = new FormData(form);

    try {
      const response = await fetch("/translate", {
        method: "POST",

        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error);

        button.disabled = false;

        button.innerHTML = "Translate & Analyze →";

        return;
      }

      // ==========================
      // Update Detected Language
      // ==========================

      languageValue.textContent = data.detected_language;

      // ==========================
      // Update Translation
      // ==========================

      translationPreview.textContent = data.translation;

      cards[0].dataset.content = data.translation;

      // ==========================
      // Update Summary
      // ==========================

      summaryPreview.textContent = data.summary;

      cards[1].dataset.content = data.summary;

      // ==========================
      // Update Key Points
      // ==========================

      keypointsPreview.innerHTML = "";

      data.key_points.forEach((point) => {
        const p = document.createElement("p");

        p.innerHTML = "• " + point;

        keypointsPreview.appendChild(p);
      });

      cards[2].dataset.content = data.key_points.join("\n• ");

      // ==========================
      // Update Action Items
      // ==========================

      actionitemsPreview.innerHTML = "";

      data.action_items.forEach((item) => {
        const p = document.createElement("p");

        p.innerHTML = "• " + item;

        actionitemsPreview.appendChild(p);
      });

      cards[3].dataset.content = data.action_items.join("\n• ");

      // ==========================
      // Nice Fade-in Animation
      // ==========================

      cards.forEach((card, index) => {
        card.style.opacity = "0";

        card.style.transform = "translateY(15px)";

        setTimeout(() => {
          card.style.transition = "all .35s ease";

          card.style.opacity = "1";

          card.style.transform = "translateY(0px)";
        }, index * 100);
      });
    } catch (err) {
      console.error(err);

      alert("Something went wrong. Please try again.");
    } finally {
      button.disabled = false;

      button.innerHTML = "Translate & Analyze →";
    }
  });
});
