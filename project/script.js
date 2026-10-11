// В стартовом проекте нет готовой логики домашней работы.
// Спроектируйте модель данных и переходы между состояниями самостоятельно.

console.log("Стартовый проект подключен")


const STORAGE_KEY = "saved-book"
const DRAFT_KEY = "book-draft"

const form = document.querySelector(".card-form")
const panels = document.querySelectorAll("[data-state-panel]")
const status = document.querySelector(".workspace__status")

let book = null

function showState(state) {
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.statePanel !== state
  })

  const messages = {
    empty: "Карточка не создана",
    editor: "Редактирование книги",
    viewer: "Карточка сохранена"
  }

  status.textContent = messages[state]
}

function showBook() {
  document.querySelector(".saved-card__title").textContent = book.title
  document.querySelector("#saved-author").textContent = book.author
  document.querySelector("#saved-genre").textContent = book.genre
  document.querySelector("#saved-year").textContent = book.year

  showState("viewer")
}

function fillForm(data) {
  form.elements.namedItem("title").value = data.title
  form.elements.namedItem("author").value = data.author
  form.elements.namedItem("genre").value = data.genre
  form.elements.namedItem("year").value = data.year
}

function restoreDraft() {
  const savedDraft = sessionStorage.getItem(DRAFT_KEY)

  if (savedDraft === null) {
    return
  }

  try {
    const draft = JSON.parse(savedDraft)

    if (
      !draft ||
      typeof draft.title !== "string" ||
      typeof draft.author !== "string" ||
      typeof draft.genre !== "string" ||
      typeof draft.year !== "string"
    ) {
      throw new Error("Некорректный черновик")
    }

    fillForm(draft)
  } catch {
    sessionStorage.removeItem(DRAFT_KEY)
  }
}

function openEditor() {
  form.reset()

  if (book) {
    fillForm(book)
  }

  restoreDraft()
  showState("editor")
}

document.querySelector('[data-action="create"]').addEventListener("click", openEditor)
document.querySelector('[data-action="edit"]').addEventListener("click", openEditor)

form.addEventListener("input", () => {
  const draft = Object.fromEntries(new FormData(form))

  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
})

form.addEventListener("submit", (event) => {
  event.preventDefault()

  const formData = new FormData(form)

  const newBook = {
    title: formData.get("title").trim(),
    author: formData.get("author").trim(),
    genre: formData.get("genre"),
    year: Number(formData.get("year"))
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(newBook))
  sessionStorage.removeItem(DRAFT_KEY)

  book = newBook
  showBook()
})

document.querySelector('[data-action="cancel"]').addEventListener("click", () => {
  sessionStorage.removeItem(DRAFT_KEY)
  form.reset()

  if (book) {
    showBook()
  } else {
    showState("empty")
  }
})

document.querySelector('[data-action="delete"]').addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(DRAFT_KEY)

  book = null
  form.reset()
  showState("empty")
})

const savedBook = localStorage.getItem(STORAGE_KEY)

if (savedBook !== null) {
  try {
    const restoredBook = JSON.parse(savedBook)

    if (
      !restoredBook ||
      typeof restoredBook.title !== "string" ||
      typeof restoredBook.author !== "string" ||
      typeof restoredBook.genre !== "string" ||
      !Number.isInteger(restoredBook.year)
    ) {
      throw new Error("Некорректные данные книги")
    }

    book = restoredBook
    showBook()
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    showState("empty")
  }
} else {
  showState("empty")
}
