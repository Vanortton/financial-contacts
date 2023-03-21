const firebaseConfig = {
    apiKey: "AIzaSyB6gOxmLYTW7VqALNXAf57JFELcZe6XTRE",
    authDomain: "my-contacts-e9909.firebaseapp.com",
    projectId: "my-contacts-e9909",
    storageBucket: "my-contacts-e9909.appspot.com",
    messagingSenderId: "748793368870",
    appId: "1:748793368870:web:1689b6f34e0892292cf1e7"
}

firebase.initializeApp(firebaseConfig)

const db = firebase.firestore()
const auth = firebase.auth()
const provider = new firebase.auth.GoogleAuthProvider()
const login = () => auth.signInWithRedirect(provider)
const logout = () => auth.signOut()
const imgsUser = document.querySelectorAll('img[img-user]')
const userName = document.querySelector('.data-user h5')
const userEmail = document.querySelector('.data-user p')
let state = 'creating'
let docID = ''
document.getElementById('contact-type-account').value = ""

firebase.auth().onAuthStateChanged(async user => {
    if (user) {
        imgsUser.forEach(img => img.src = user.photoURL)
        userName.innerHTML = user.displayName
        userEmail.innerHTML = user.email
        init(); addSnapshot(user.email)
    } else {
        imgsUser.forEach(img => img.src = 'assets/UserIcon.png')
        userName.innerHTML = 'Usuário deslogado'
        userEmail.innerHTML = 'email@ex.com'
        createAlert('info', 'Faça login', 'Entre em uma conta do google para salvar seus contatos.', 5000)
        displayData()
    }
})

const form = document.getElementById("cadastre")
form.onreset = e => {
    e.target.reset()
    document.getElementById("display-imagem").innerHTML = ''
}

function init() {
    form.onsubmit = e => {
        e.preventDefault()
        const contactImg = document.getElementById('contact-img')
        const dataContact = {
            id: removeSpacesAndAccents(document.getElementById('contact-name').value) + new Date().getTime(),
            name: document.getElementById('contact-name').value,
            nameFantasy: document.getElementById('contact-name-fantasy').value,
            bank: document.getElementById('contact-bank').value,
            agency: document.getElementById('contact-agency').value,
            account: document.getElementById('contact-account').value,
            typeAccount: document.getElementById('contact-type-account').value,
            dateOpening: document.getElementById('contact-date-opening').value
        }

        if (state === 'editing') {
            delete dataContact.id
            const filteredData = Object.entries(dataContact).filter(data => !!data[1])
            const changedData = {}
            filteredData.forEach(data => changedData[data[0]] = data[1])
            if (contactImg.files?.length > 0) {
                document.querySelector('.loading p').innerHTML = 'Enviando foto 🌄'
                toggleLoading(true)
                imgInBase64(contactImg.files[0])
                    .then(base64 => {
                        const storageRef = firebase.storage()
                            .ref('contactsImgs/' + docID)
                        const task = storageRef.putString(base64.substring(23), 'base64')

                        task.on('state_changed',
                            function progress(snapshot) {
                                let percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                                document.querySelector('.loading p').innerHTML = 'Enviando foto 🌄 - ' + percentage + '%'
                                document.querySelector('.loading .progress .progress-bar').style.width = percentage + '%'
                            },
                            function error(err) {
                                alert('Um erro ocorreu enquanto o elemento de mídia era carregado. Tente novamente. ' + err)
                            },
                            function complete() {
                                task.snapshot.ref.getDownloadURL()
                                    .then(imageURL => {
                                        changedData.photo = imageURL
                                        document.querySelector('.loading p').innerHTML = 'Enviando os dados 🧾'
                                        db.collection(auth.currentUser.email).doc(docID).update(changedData)
                                            .then(() => {
                                                toggleLoading(false)
                                                createAlert('success', 'Contato cadastrado', 'Seu contato foi cadastrado com sucesso!')
                                            }).catch(err => {
                                                toggleLoading(false)
                                                createAlert('error', 'Erro inesperado!', 'Não foi possível cadastrar o contato')
                                            })
                                    })
                            }
                        )
                    })
            }
        } else if (!contactImg.files?.length > 0) {
            createAlert('danger', 'Selecione uma imagem', 'Por favor, selecione uma imagem para o contato.')
        } else if (!dataContact.name) {
            createAlert('danger', 'Digite um nome', 'Por favor, preencha o campo do nome para o contato.')
        } else if (!dataContact.nameFantasy) {
            createAlert('danger', 'Digite um nome fantasia', 'Por favor, preencha o campo do nome fantasia para o contato.')
        } else if (!dataContact.bank) {
            createAlert('danger', 'Preencha o campo "banco"', 'Por favor, preencha o campo do banco do contato.')
        } else if (!dataContact.agency) {
            createAlert('danger', 'Preencha o campo "agência"', 'Por favor, preencha o campo da agência do contato.')
        } else if (!dataContact.account) {
            createAlert('danger', 'Preencha o campo "conta"', 'Por favor, preencha o campo "conta" do contato.')
        } else if (!dataContact.typeAccount) {
            createAlert('danger', 'Escolha um tipo de conta', 'Por favor, escolha o tipo de conta do contato.')
        } else if (!dataContact.dateOpening) {
            createAlert('danger', 'Digite a data de abertura', 'Por favor, preencha o campo "data de abertura" do contato.')
        } else {
            addContact(dataContact, contactImg)
        }
    }
}

function addContact(dataContact, contactImg) {
    dataContact.dateCreated = new Date().toString()
    imgInBase64(contactImg.files[0])
        .then(base64 => {
            console.log(base64)
            const storageRef = firebase.storage()
                .ref('contactsImgs/' + removeSpacesAndAccents(dataContact.name) + new Date().getTime())
            const task = storageRef.putString(base64.substring(23), 'base64')
            document.querySelector('.loading p').innerHTML = 'Enviando foto 🌄'
            toggleLoading(true)

            task.on('state_changed',
                function progress(snapshot) {
                    let percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    document.querySelector('.loading p').innerHTML = 'Enviando foto 🌄 - ' + percentage + '%'
                    document.querySelector('.loading .progress .progress-bar').style.width = percentage + '%'
                },
                function error(err) {
                    alert('Um erro ocorreu enquanto o elemento de mídia era carregado. Tente novamente. ' + err)
                },
                function complete() {
                    document.querySelector('.loading p').innerHTML = 'Enviando os dados 🧾'
                    task.snapshot.ref.getDownloadURL()
                        .then(imageURL => {
                            dataContact.photo = imageURL
                            db.collection(auth.currentUser.email).doc(dataContact.id).set(dataContact)
                                .then(() => {
                                    createAlert('success', 'Contato cadastrado', 'Seu contato foi cadastrado com sucesso!')
                                    toggleLoading(false)
                                }).catch(err => {
                                    createAlert('error', 'Erro inesperado!', 'Não foi possível cadastrar o contato')
                                    toggleLoading(false)
                                })
                        })
                }
            )
        })
}

function addSnapshot(email) {
    db.collection(email).onSnapshot(snapshot => {
        snapshot = snapshot.docs.map(doc => doc.data())
        displayData(snapshot)
    })
}

function displayData(snapshot) {
    const ul = document.getElementById('list-contacts')
    if (snapshot) {
        ul.innerHTML = ""
        if (!!snapshot.length) {
            snapshot.forEach(doc => {
                const heading = `<div class="heading d-flex align-items-center justify-content-between" style="flex-shrink: 0;">
                <div class="d-flex align-items-center"><img src="${doc.photo}" height="80" class="rounded" /><h3 class="ps-2" style="max-width: 40vw;white-space: nowrap;overflow: hidden;text-overflow: ellipsis;">${doc.name}</h3></div>
                <div class="d-flex flex-nowrap"><button class="btn btn-success me-2" onclick="editeContact('${doc.id}')">✏</button><button class="btn btn-danger" onclick="deleteContact('${doc.id}')">🗑</button></div></div><hr />`
                const array = [
                    { name: 'Nome', value: doc.name },
                    { name: 'Nome fantasia', value: doc.nameFantasy },
                    { name: 'Banco', value: doc.bank },
                    { name: 'Agência', value: doc.agency },
                    { name: 'Conta', value: doc.account },
                    { name: 'Tipo da conta', value: doc.typeAccount },
                    { name: 'Data de abertura', value: doc.dateOpening },
                    { name: 'Data de criação', value: doc.dateCreated },
                ]
                const body = array.map(dt => `<p class="m-0"><strong>${dt.name}:</strong> ${replaceData(dt.value)}</p>`)
                ul.innerHTML += '<li class="d-flex flex-column rounded border p-3 mb-3">' + heading + body.join('') + '</li>'
            })
        } else {
            ul.innerHTML = '<li class="d-block text-center"><h3>Nenhum contato encontrado! 😢</h3><button class="btn btn-primary" onclick="toggleForm(true)">Adicione um novo</button></li>'
        }
    } else if (!auth.currentUser) {
        ul.innerHTML = '<li class="d-block text-center"><h3>Seus contatos serão listados aqui! 🧾</h3></li>'
    }
}

const toggleForm = bool => bool ?
    form.style.display = 'block' :
    form.style.display = 'none'

const toggleLoading = bool => bool ?
    document.querySelector('.loading').style.display = 'flex' :
    document.querySelector('.loading').style.display = 'none'

toggleLoading(false)

const removeSpacesAndAccents = (str) => {
    return str
        .toLowerCase()
        .replace(/\s/g, "")
        .replace(/[àáâãäå]/g, "a")
        .replace(/[èéêë]/g, "e")
        .replace(/[ìíîï]/g, "i")
        .replace(/[òóôõöø]/g, "o")
        .replace(/[ùúûü]/g, "u")
        .replace(/[ýÿ]/g, "y")
        .replace(/[ç]/g, "c")
}

function createAlert(type, title, message, timeout = 3000) {
    const alert = document.createElement('div')
    addClass(`alert alert-${type} alert-dismissible fade show`, alert)
    alert.setAttribute('role', 'alert')

    const titleEl = document.createElement('h4')
    titleEl.classList.add('alert-heading')
    titleEl.innerHTML = title

    const hr = document.createElement('hr')

    const messageEl = document.createElement('p')
    messageEl.classList.add('mb-0')
    messageEl.innerHTML = message

    const buttonClose = document.createElement('button')
    buttonClose.classList.add('btn-close')
    buttonClose.setAttribute('type', 'button')
    buttonClose.setAttribute('data-bs-dismiss', 'alert')
    buttonClose.setAttribute('arial-label', 'Fechar')

    alert.appendChild(titleEl)
    alert.appendChild(hr)
    alert.appendChild(messageEl)
    alert.appendChild(buttonClose)

    document.querySelector('main').insertAdjacentElement('afterbegin', alert)
    setTimeout(() => buttonClose.click(), timeout)
}

function imgInBase64(file) {
    return new Promise(resolve => {
        const reader = new FileReader()
        reader.onload = function (e) {
            resolve(reader.result)
        }
        reader.readAsDataURL(file)
    })
}

document.getElementById('contact-img').onchange = e => {
    if (e.target.files[0]) {
        document.getElementById("display-imagem").innerHTML = ""
        imgInBase64(e.target.files[0])
    } else {
        document.getElementById("display-imagem").innerHTML = ""
    }
}

function editeContact(id) {
    toggleForm(true)
    state = 'editing'
    docID = id
}

function deleteContact(id) {
    db.collection(auth.currentUser.email).doc(id)
        .delete().then(() => {
            createAlert('success', 'Contato deletado com sucesso', 'Pronto! O contato já foi deletado.')
        }).catch(err => createAlert('danger', 'Erro inesperado!', 'Um erro ocorreu e o contato não foi deletado. 😭'))
}

function replaceData(data) {
    if (data.includes('(Horário Padrão de Brasília)') || data.includes('GMT-')) {
        return new Date(data).toLocaleDateString() + ' ' + new Date(data).toLocaleTimeString()
    }

    switch (data) {
        case 'savings': return 'Poupança'
        case 'checking-account': return 'Conta corrente'
        case 'Poupança': return 'savings'
        case 'Conta corrente': return 'checking-account'
        default: return data
    }
}

function showHideHelp(boll) {
    const popupSearch = document.querySelector('.popup-search')
    if (boll) {
        popupSearch.style.visibility = 'visible'
        setTimeout(() => popupSearch.style.opacity = 1, 0)
    } else {
        popupSearch.style.opacity = 0
        setTimeout(() => popupSearch.style.visibility = 'hidden', 550)
    }
}

showHideHelp(false)

function filterData(data) {
    const type = data.split(': ')[0]
    const defaultNamesTypes = { nome: 'name', nomefantasia: 'nameFantasy', banco: 'bank', 'agência': 'agency', conta: 'account', tipodaconta: 'typeAccount' }
    if (!auth.currentUser?.email) {
        createAlert('warn', 'Faça login', 'Entre em uma conta do google para salvar seus contatos.', 5000)
    } else if (type === 'Nome' || type === 'Nome fantasia' || type === 'Banco' || type === 'Agência' || type === 'Conta' || type === 'Tipo da conta') {
        const currentData = data.split(': ')[1]
        const currentTypeDefaultName = defaultNamesTypes[type.toLowerCase().replace(/\s/g, '')]
        if (currentData?.length > 0) {
            db.collection(auth.currentUser?.email).get()
                .then(snapshot => {
                    const docsData = snapshot.docs.map(doc => {
                        const dataDoc = doc.data()
                        for (let key in dataDoc) dataDoc[key] = replaceData(dataDoc[key])
                        return dataDoc
                    })
                    const filteredDocs = docsData.filter(doc => doc[currentTypeDefaultName].includes(currentData))
                    displayData(filteredDocs)
                })
        }
    } else if (type === 'Data de criação' || type === 'Data de abertura') {
        const date = data.split(': ')[1]
        const dateTypeToSearch = type === 'Data de criação' ? 'dateCreated' : 'dateOpening'
        if (date?.length === 10) {
            createAlert('success', 'Data válida', 'A data digitada é válida 📆', 3000)
            db.collection(auth.currentUser?.email).get()
                .then(snapshot => {
                    const docsWithDateFormate = snapshot.docs.map(doc => {
                        const dataDoc = doc.data()
                        for (let key in dataDoc) {
                            if (dataDoc[key].includes('(Horário Padrão de Brasília)') || dataDoc[key].includes('GMT-'))
                                dataDoc[key] = new Date(dataDoc[key]).toLocaleDateString()
                        }
                        return dataDoc
                    })
                    const filteredDocs = docsWithDateFormate.filter(doc => doc[dateTypeToSearch] === date)
                    displayData(filteredDocs)
                })
        }
    } else {
        const defaultNamesTypes = ['name', 'nameFantasy', 'bank', 'agency', 'account', 'typeAccount', 'dateOpening', 'dateCreated']
        const docsSearched = []
        db.collection(auth.currentUser?.email).get()
            .then(snapshot => {
                const docsData = snapshot.docs.map(doc => {
                    const dataDoc = doc.data()
                    for (let key in dataDoc) dataDoc[key] = replaceData(dataDoc[key])
                    return dataDoc
                })
                for (let i = 0; i < defaultNamesTypes.length; i++) {
                    console.log(defaultNamesTypes[i])
                    const filteredDocs = docsData.filter(doc => doc[defaultNamesTypes[i]].toLowerCase().includes(data.toLowerCase()))
                    filteredDocs.forEach(doc => {
                        if (!docsSearched.find(obj => obj.id === doc.id)) docsSearched.push(doc)
                    })
                }
                displayData(docsSearched)
            })
    }
}

document.getElementById('search-contacts').onkeyup = e => {
    search(e)
}

function search(e = false) {
    if (e?.target?.value) {
        filterData(e.target.value)
    } else if (e?.target?.value === '') {
        db.collection(auth.currentUser?.email).get()
            .then(snapshot => {
                const docs = snapshot.docs.map(doc => doc.data())
                displayData(docs)
            })
    }
}

let alertDateExistis = false

const addClass = (clss, elem) => clss.split(' ').forEach(cls => elem.classList.add(cls))

toggleForm(false)