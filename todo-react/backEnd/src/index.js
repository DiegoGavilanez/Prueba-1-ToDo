import express from "express";
import cors from "cors";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const upload = multer({ 
    dest: "uploads/",
    limits: { fileSize: 50 * 1024 * 1024 } 
});

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

app.use(cors());
app.use(express.json());

prisma.$connect()
  .then(() => console.log("Conexión establecida Prisma - MariaDB"))
  .catch((err) => console.error("Incidente al establecer conexión - Prisma:", err));


// --- FUNCIONES AUXILIARES ---

const excelDateToJSDate = (excelDate) => {
    if (typeof excelDate !== 'number' || isNaN(excelDate)) {
        return null;
    }
    
    const date = new Date(Math.round((excelDate - 25569) * 86400000));
    
    if (isNaN(date.getTime())) {
        return null;
    }
    return date;
};


// --- RUTAS PÚBLICAS ---

app.get("/", (req, res) => {
  res.json({ message: "Backend Zeebra - Diego Gavilánez - FUNCIONANDO" });
});

// --- CRUD: OBTENER TAREAS CON PAGINACIÓN ---
app.get("/api/tasks", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const totalTasks = await prisma.task.count();

    const tasks = await prisma.task.findMany({
      skip: skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(totalTasks / limit);

    res.json({
      tasks,
      totalTasks,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error obteniendo tareas:", error);
    res.status(500).json({ error: "Error obteniendo tareas" });
  }
});

// --- CRUD: CREAR TAREA ---
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, description, status = "pending", dueDate } = req.body;
    
    if (!title?.trim()) {
      return res.status(400).json({ error: "Título requerido" });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description || null,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    
    console.log("Tarea creada exitosamente", task);
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creando tarea:", error);
    res.status(500).json({ error: "Incidente al crear tarea: " + error.message });
  }
});

// --- CRUD: ACTUALIZAR TAREA ---
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, dueDate } = req.body; 
    
    const dataToUpdate = {};
    
    if (title !== undefined) {
        if (!title.trim()) return res.status(400).json({ error: "Título no puede estar vacío" });
        dataToUpdate.title = title.trim();
    }
    if (description !== undefined) {
        dataToUpdate.description = description || null;
    }
    if (status !== undefined) {
        if (!["pending", "in_progress", "completed"].includes(status)) {
            return res.status(400).json({ error: "Estado inválido" });
        }
        dataToUpdate.status = status;
    }
    if (dueDate !== undefined) {
        dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
    }
    
    const task = await prisma.task.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });
    
    res.json(task);
  } catch (error) {
    console.error("Error actualizando tarea:", error);
    res.status(500).json({ error: "Error actualizando tarea: " + error.message });
  }
});


// --- IMPORTAR EXCEL ---
app.post("/api/tasks/import", upload.single("file"), async (req, res) => {
    let filePath;
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se encontró ningún archivo para importar." });
        }
        
        filePath = req.file.path;
        
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const excelData = XLSX.utils.sheet_to_json(sheet, {
            header: 1, 
            raw: true,
            defval: null
        });

        if (excelData.length < 2) {
            return res.status(400).json({ error: "El archivo Excel está vacío o solo contiene encabezados." });
        }

        const headers = excelData[0].map(h => String(h || "").toLowerCase().trim());
        const dataRows = excelData.slice(1);
        
        const tasksToInsert = [];
        const errors = [];

        const titleIndex = headers.findIndex(h => h.includes('title') || h.includes('titulo'));
        const descIndex = headers.findIndex(h => h.includes('description') || h.includes('descripcion'));
        const dueDateIndex = headers.findIndex(h => h.includes('duedate') || h.includes('vencimiento') || h.includes('fecha'));
        const statusIndex = headers.findIndex(h => h.includes('status') || h.includes('estado'));
        
        if (titleIndex === -1) {
             return res.status(400).json({ error: "Columna 'Título' (o 'Title') no encontrada en el encabezado del archivo." });
        }

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const rowIndex = i + 2;
            
            let title = String(row[titleIndex] || "").trim();
            let dueDateValue = row[dueDateIndex];
            let statusValue = String(row[statusIndex] || "").toLowerCase().trim();

            if (!title) {
                errors.push(`Fila ${rowIndex}: Título es obligatorio y está vacío.`);
                continue;
            }

            let finalDueDate = null;
            if (dueDateValue !== null && dueDateValue !== "") {
                let parsedDate = null;

                if (typeof dueDateValue === 'number') {
                    parsedDate = excelDateToJSDate(dueDateValue);
                } else if (typeof dueDateValue === 'string') {
                    parsedDate = new Date(dueDateValue);
                }

                if (parsedDate && !isNaN(parsedDate.getTime())) {
                    finalDueDate = parsedDate;
                } else {
                    errors.push(`Fila ${rowIndex}: La fecha de vencimiento ('${dueDateValue}') no tiene un formato válido.`);
                    continue;
                }
            }

            const validStatus = ["pending", "in_progress", "completed"];
            let finalStatus = validStatus.includes(statusValue) ? statusValue : "pending";

            tasksToInsert.push({
                title: title,
                description: String(row[descIndex] || "") || null,
                status: finalStatus,
                dueDate: finalDueDate,
            });
        }
        
        if (errors.length > 0) {
            const errorSummary = `Se encontraron ${errors.length} errores de validación. Las tareas no se importaron. Detalles: ${errors.join('; ')}`;
            return res.status(400).json({ error: errorSummary });
        }
        
        if (tasksToInsert.length > 0) {
            await prisma.task.createMany({ data: tasksToInsert, skipDuplicates: true });
        }
        
        console.log(`✅ Importadas ${tasksToInsert.length} tareas.`);
        res.json({ message: `¡Importación exitosa! Se insertaron ${tasksToInsert.length} tareas.` });

    } catch (e) {
        console.error("Error importando Excel:", e);
        res.status(500).json({ error: `Error interno al procesar la importación: ${e.message}` });
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
});


// --- CRUD: ELIMINAR TAREA ---
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.delete({
      where: { id: parseInt(id) },
    });
    
    console.log("✅ Tarea eliminada:", task);
    res.json({ message: "Tarea eliminada con éxito" });
  } catch (error) {
    console.error("Error eliminando tarea:", error);
    if (error.code === 'P2025') {
        return res.status(404).json({ error: "Tarea no encontrada para eliminar" });
    }
    res.status(500).json({ error: "Error eliminando tarea" });
  }
});


const PORT = 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
});

server.timeout = 300000; 

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});