document.addEventListener("DOMContentLoaded", () => {
    const tipoCartao = document.getElementById("tipoCartao");
    const digiconField = document.getElementById("digiconField");
    const prodataField = document.getElementById("prodataField");
    const meiaViagemField = document.getElementById("meiaViagemField");
    const dataRetirada = document.getElementById("dataRetirada");
    const form = document.getElementById("emprestimoForm");
    const matriculaMotorista = document.getElementById("matriculaMotorista");
    const nomeMotorista = document.getElementById("nomeMotorista");

    const numBordoDigiconSelect = document.getElementById("numBordoDigicon");
    const numBordoProdataSelect = document.getElementById("numBordoProdata");
    const numMeiaViagemSelect = document.getElementById("numMeiaViagem");

    const hoje = new Date();
    dataRetirada.value = hoje.toLocaleDateString("pt-BR");

    // Função para atualizar o estoque lateral e preencher os selects
    async function atualizarEstoque() {
        const estoqueDiv = document.getElementById("estoqueConteudo");
        estoqueDiv.innerHTML = "Atualizando...";

        const total = { digicon: 15, prodata: 15, meiaViagem: 10 };
        const emprestados = { digicon: [], prodata: [], meiaViagem: [] };

        const snapshot = await db.collection("emprestimos")
            .where("status", "==", "em aberto")
            .get();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.tipoCartao === "digicon" && data.numBordoDigicon)
                emprestados.digicon.push(Number(data.numBordoDigicon));
            if (data.tipoCartao === "prodata" && data.numBordoProdata)
                emprestados.prodata.push(Number(data.numBordoProdata));
            if (data.numMeiaViagem)
                emprestados.meiaViagem.push(Number(data.numMeiaViagem));
        });

        function gerarLista(tipo) {
            const todos = Array.from({ length: total[tipo] }, (_, i) => i + 1);
            const disponiveis = todos.filter(n => !emprestados[tipo].includes(n));

            // Preenche os selects
            if (tipo === "digicon") {
                numBordoDigiconSelect.innerHTML = "";
                disponiveis.forEach(n => {
                    const option = document.createElement("option");
                    option.value = n;
                    option.textContent = n;
                    numBordoDigiconSelect.appendChild(option);
                });
            } else if (tipo === "prodata") {
                numBordoProdataSelect.innerHTML = "";
                disponiveis.forEach(n => {
                    const option = document.createElement("option");
                    option.value = n;
                    option.textContent = n;
                    numBordoProdataSelect.appendChild(option);
                });
            } else if (tipo === "meiaViagem") {
                numMeiaViagemSelect.innerHTML = "";
                disponiveis.forEach(n => {
                    const option = document.createElement("option");
                    option.value = n;
                    option.textContent = n;
                    numMeiaViagemSelect.appendChild(option);
                });
            }

            return `
                <div class="cardEstoque">
                    <h3>${tipo === 'digicon' ? 'Bordo Digicon' : tipo === 'prodata' ? 'Bordo Prodata' : 'Meia Viagem'}</h3>
                    <p><b>Disponível:</b> ${disponiveis.length}</p>
                    <p><b>Emprestado:</b> ${emprestados[tipo].length}</p>
                    <p><b>Disponíveis:</b> ${disponiveis.join(', ') || '-'}</p>
                    <p><b>Emprestados:</b> ${emprestados[tipo].join(', ') || '-'}</p>
                </div>`;
        }

        estoqueDiv.innerHTML =
            gerarLista("digicon") +
            gerarLista("prodata") +
            gerarLista("meiaViagem");
    }

    atualizarEstoque();

    // Mostra/oculta campos conforme tipo do cartão
    tipoCartao.addEventListener("change", () => {
        digiconField.style.display = "none";
        prodataField.style.display = "none";
        meiaViagemField.style.display = "none";

        if (tipoCartao.value === "digicon") {
            digiconField.style.display = "flex";
            meiaViagemField.style.display = "flex";
        } else if (tipoCartao.value === "prodata") {
            prodataField.style.display = "flex";
            meiaViagemField.style.display = "flex";
        } else if (tipoCartao.value === "meiaViagem") {
            meiaViagemField.style.display = "flex";
        }
    });

    function calcularPrazo(motivo) {
        const prazo = new Date();
        if (motivo === "Perda" || motivo === "Roubo/Furto") prazo.setDate(prazo.getDate() + 3);
        else if (motivo === "Danificado") prazo.setDate(prazo.getDate() + 2);
        else prazo.setDate(prazo.getDate() + 1);
        return prazo.toLocaleDateString("pt-BR");
    }

    // Busca nome automaticamente ao digitar matrícula
    matriculaMotorista.addEventListener("input", async () => {
        const matricula = matriculaMotorista.value.trim();
        if (!matricula) {
            nomeMotorista.value = "";
            return;
        }

        try {
            const ref = db.collection("motoristas").doc(matricula);
            const docSnap = await ref.get();

            if (docSnap.exists) {
                const dados = docSnap.data();
                nomeMotorista.value = dados.nome || "";
            } else {
                nomeMotorista.value = "";
            }
        } catch (e) {
            console.error("Erro ao buscar motorista:", e);
        }
    });

    // Envia dados ao Firestore e gera PDFs
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const dados = {
            nomeMotorista: nomeMotorista.value.trim(),
            matriculaMotorista: matriculaMotorista.value.trim(),
            tipoCartao: tipoCartao.value,
            numBordoDigicon: numBordoDigiconSelect.value || "",
            numBordoProdata: numBordoProdataSelect.value || "",
            numMeiaViagem: numMeiaViagemSelect.value || "",
            motivo: document.getElementById("motivo").value,
            matriculaEmpresto: document.getElementById("matriculaEmpresto").value.trim(),
            dataRetirada: dataRetirada.value,
            prazoDevolucao: calcularPrazo(document.getElementById("motivo").value),
            status: "em aberto",
            timestamp: new Date()
        };

        try {
            await db.collection("emprestimos").add(dados);

            if (typeof atualizarEstoque === "function") atualizarEstoque();
            if (typeof gerarPDF_A4 === "function") gerarPDF_A4(dados);
            if (typeof gerarPDF_Termica === "function") gerarPDF_Termica(dados);

            alert("Registro salvo com sucesso!");
            form.reset();
            dataRetirada.value = hoje.toLocaleDateString("pt-BR");
        } catch (err) {
            console.error("Erro ao salvar:", err);
            alert("Erro ao salvar registro. Veja o console.");
        }
    });

    document.getElementById("relatorioBtn").addEventListener("click", () => {
        window.location.href = "relatorio.html";
    });
});
