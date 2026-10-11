// В стартовом проекте нет готовой логики домашней работы.
// Спроектируйте модель данных и переходы между состояниями самостоятельно.

console.log("Стартовый проект подключен")



const STORAGE_KEY = "saved-books"
const OLD_STORAGE_KEY = "saved-book"
const DRAFT_KEY = "book-draft"
const BOOK_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000

const form = document.querySelector(".card-form")
const panels = document.querySelectorAll("[data-state-panel]")
const status = document.querySelector(".workspace__status")
const bookList = document.querySelector("#book-list")
const draftNotice = document.querySelector("#draft-notice")
const expiryNotice = document.querySelector("#expiry-notice")
const expiryText = document.querySelector("#expiry-text")
const yearInput = document.querySelector("#card-year")
const yearError = document.querySelector("#year-error")

let expiredCount = 0

function isValidBook(book) {
  return book !== null && typeof book === "object" &&
    Number.isInteger(book.id) && book.id > 0 &&
    typeof book.title === "string" && book.title.trim().length >= 3 &&
    typeof book.author === "string" && book.author.trim().length >= 2 &&
    typeof book.genre === "string" && book.genre.length > 0 &&
    Number.isInteger(book.year) && book.year >= 1 &&
    Number.isInteger(book.savedAt) && book.savedAt >= 0
}

function loadBooks() {
  const saved = localStorage.getItem(STORAGE_KEY)
  const oldSaved = saved === null ? localStorage.getItem(OLD_STORAGE_KEY) : null

  if (saved === null && oldSaved === null) return []

  try {
    const data = JSON.parse(saved ?? oldSaved)
    const loaded = Array.isArray(data) ? data : [{ ...data, id: 1 }]
    const now = Date.now()

    const datedBooks = loaded.map((book) => ({
      ...book,
      savedAt: book.savedAt ?? now
    }))

    if (
      !datedBooks.every(isValidBook) ||
      new Set(datedBooks.map((book) => book.id)).size !== datedBooks.length
    ) {
      throw new Error("Некорректные данные книг")
    }

    const activeBooks = datedBooks.filter(
      (book) => now - book.savedAt < BOOK_LIFETIME_MS
    )

    expiredCount = datedBooks.length - activeBooks.length

    if (activeBooks.length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeBooks))
    }

    if (oldSaved !== null) {
      localStorage.removeItem(OLD_STORAGE_KEY)
    }

    return activeBooks
  } catch {
    localStorage.removeItem(saved === null ? OLD_STORAGE_KEY : STORAGE_KEY)
    return []
  }
}

let books = loadBooks()
let selectedId = null

function readDraft() {
  const saved = sessionStorage.getItem(DRAFT_KEY)

  if (saved === null) return null

  try {
    let draft = JSON.parse(saved)

    if (draft && !Object.hasOwn(draft, "values")) {
      draft = {
        bookId: books.length === 1 ? books[0].id : null,
        values: draft
      }
    }

    if (
      !draft ||
      (draft.bookId !== null && !Number.isInteger(draft.bookId)) ||
      !draft.values || typeof draft.values !== "object" ||
      ["title", "author", "genre", "year"].some(
        (key) => typeof draft.values[key] !== "string"
      ) ||
      (draft.bookId !== null && !books.some((book) => book.id === draft.bookId))
    ) {
      throw new Error("Некорректный черновик")
    }

    return draft
  } catch {
    sessionStorage.removeItem(DRAFT_KEY)
    return null
  }
}

function updateDraftNotice() {
  draftNotice.hidden = readDraft() === null
}

function showState(state) {
  panels.forEach((panel) => {
    panel.hidden = panel.dataset.statePanel !== state
  })

  const messages = {
    empty: "Карточек пока нет",
    collection: `Книг: ${books.length}`,
    editor: "Редактирование книги",
    viewer: "Просмотр книги"
  }

  status.textContent = messages[state]
}

function renderCollection() {
  bookList.replaceChildren()

  books.forEach((book) => {
    const item = document.createElement("li")
    item.className = "collection__item"

    const button = document.createElement("button")
    button.type = "button"
    button.className = "collection__book"
    button.textContent = `${book.title} — ${book.author}`
    button.addEventListener("click", () => showBook(book.id))

    item.append(button)
    bookList.append(item)
  })
}

function showCollection() {
  selectedId = null
  renderCollection()
  showState(books.length === 0 ? "empty" : "collection")
}

function showBook(id) {
  const book = books.find((item) => item.id === id)

  if (!book) {
    showCollection()
    return
  }

  selectedId = id

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

function validateYear() {
  const currentYear = new Date().getFullYear()
  const year = Number(yearInput.value)

  const message = yearInput.value !== "" && year > currentYear
    ? `Год издания не может быть больше ${currentYear}`
    : ""

  yearInput.setCustomValidity(message)
  yearError.textContent = message
  yearError.hidden = message === ""
}

function openEditor(id = null) {
  const draft = readDraft()

  if (draft && draft.bookId !== id) {
    if (!confirm("Есть черновик другой книги. Заменить его?")) return

    sessionStorage.removeItem(DRAFT_KEY)
    updateDraftNotice()
  }

  selectedId = id
  form.reset()

  if (id !== null) {
    const book = books.find((item) => item.id === id)

    if (!book) {
      showCollection()
      return
    }

    fillForm(book)
  }

  const currentDraft = readDraft()

  if (currentDraft && currentDraft.bookId === id) {
    fillForm(currentDraft.values)
  }

  validateYear()
  showState("editor")
}

document.querySelectorAll('[data-action="create"]').forEach((button) => {
  button.addEventListener("click", () => openEditor())
})

document.querySelector('[data-action="edit"]').addEventListener("click", () => {
  openEditor(selectedId)
})

document.querySelector('[data-action="back"]').addEventListener("click", showCollection)

document.querySelector('[data-action="resume-draft"]').addEventListener("click", () => {
  const draft = readDraft()

  if (draft) {
    openEditor(draft.bookId)
  }
})

document.querySelector('[data-action="discard-draft"]').addEventListener("click", () => {
  sessionStorage.removeItem(DRAFT_KEY)
  updateDraftNotice()
})

yearInput.addEventListener("input", validateYear)

form.addEventListener("input", () => {
  const values = Object.fromEntries(new FormData(form))

  sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
    bookId: selectedId,
    values
  }))

  updateDraftNotice()
})

form.addEventListener("submit", (event) => {
  event.preventDefault()
  validateYear()

  if (!form.reportValidity()) return

  const data = new FormData(form)

  const values = {
    title: data.get("title").trim(),
    author: data.get("author").trim(),
    genre: data.get("genre"),
    year: Number(data.get("year")),
    savedAt: Date.now()
  }

  if (selectedId === null) {
    selectedId = books.reduce((max, book) => Math.max(max, book.id), 0) + 1

    books.push({
      id: selectedId,
      ...values
    })
  } else {
    const index = books.findIndex((book) => book.id === selectedId)

    if (index === -1) {
      showCollection()
      return
    }

    books[index] = {
      id: selectedId,
      ...values
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
  sessionStorage.removeItem(DRAFT_KEY)

  updateDraftNotice()
  showBook(selectedId)
})

document.querySelector('[data-action="cancel"]').addEventListener("click", () => {
  sessionStorage.removeItem(DRAFT_KEY)
  updateDraftNotice()
  form.reset()
  validateYear()

  if (selectedId !== null) {
    showBook(selectedId)
  } else {
    showCollection()
  }
})

document.querySelector('[data-action="delete"]').addEventListener("click", () => {
  const draft = readDraft()

  if (draft && draft.bookId === selectedId) {
    sessionStorage.removeItem(DRAFT_KEY)
  }

  books = books.filter((book) => book.id !== selectedId)

  if (books.length === 0) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books))
  }

  updateDraftNotice()
  showCollection()
})

updateDraftNotice()

if (expiredCount > 0) {
  expiryText.textContent =
    `Удалено устаревших книг: ${expiredCount}. ` +
    "Срок хранения — 30 дней. Можно создать новую карточку."

  expiryNotice.hidden = false
}

if (books.length === 1) {
  showBook(books[0].id)
} else {
  showCollection()
}
