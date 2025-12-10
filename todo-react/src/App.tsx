import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/tasks";

// Definición de tipos
type Task = {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type PaginatedTasks = {
  tasks: Task[];
  totalTasks: number;
  totalPages: number;
  currentPage: number;
};

function App() {
  // --- ESTADOS PRINCIPALES ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notification, setNotification] = useState("");
  
  // --- ESTADOS DE EDICIÓN ---
  const [isEditing, setIsEditing] = useState(false); 
  const [currentTask, setCurrentTask] = useState<Task | null>(null); 

  // --- ESTADOS DE CONFIRMACIÓN ---
  const [isConfirming, setIsConfirming] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{ id: number; title: string } | null>(null);


  // --- FUNCIÓN DE NOTIFICACIÓN ---
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000); 
  };

  const currentYear = new Date().getFullYear();

  // --- CARGAR TAREAS CON PAGINACIÓN ---
  const loadTasks = async () => {
    try {
      const res = await axios.get<PaginatedTasks>(`${API}?page=${currentPage}&limit=7`);
      
      setTasks(res.data.tasks);
      setTotalPages(res.data.totalPages);
      
      if (currentPage > res.data.totalPages && res.data.totalPages > 0) {
        setCurrentPage(res.data.totalPages);
      }
    } catch (error) {
      console.error("Error cargando tareas:", error);
      showNotification("Error al cargar tareas");
    }
  };


  // --- EFECTO DE RECARGA ---
  useEffect(() => {
    loadTasks();
  }, [currentPage]);


  // --- CREAR TAREA ---
  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return showNotification("El título es obligatorio"); 

    try {
      await axios.post(API, {
        title: title.trim(),
        description: description || null,
        status: "pending",
        dueDate: dueDate || null
      });

      setTitle("");
      setDescription("");
      setDueDate("");
      
      setCurrentPage(1); 
      loadTasks(); 

      showNotification("✅ Tarea creada exitosamente");
    } catch (err: any) {
      console.error("Error al crear tarea:", err.response?.data || err);
      showNotification(`Error: ${err.response?.data?.error || "Error al crear la tarea"}`);
    }
  };


  // --- ACTUALIZAR ESTADO DE TAREA ---
  const changeStatus = async (id: number, status: Task["status"]) => {
    try {
      await axios.put(`${API}/${id}`, { status });
      loadTasks(); 
      showNotification("✅ Estado actualizado");
    } catch (err: any) {
      console.error("Error al actualizar:", err);
      showNotification("Error al actualizar el estado");
    }
  };

  // --- INICIAR ELIMINACIÓN ---
  const deleteTask = (id: number, title: string) => {
    setTaskToDelete({ id, title });
    setIsConfirming(true);
  };

// --- CONFIRMAR ELIMINACIÓN ---
const confirmDeletion = async () => {
    if (!taskToDelete) return;

    const { id, title } = taskToDelete; 
    
    setIsConfirming(false);
    setTaskToDelete(null);

    try {
      await axios.delete(`${API}/${id}`);

      loadTasks();
      showNotification(`🗑️ Tarea "${title}" eliminada con éxito`);
    } catch (err: any) {
      console.error("Error al eliminar tarea:", err.response?.data || err);
      showNotification(`Error al eliminar: ${err.response?.data?.error || "Error desconocido"}`);
    }
};


  // --- INICIAR EDICIÓN ---
  const openEditModal = (task: Task) => {
    const formattedTask = {
        ...task,
        dueDate: task.dueDate ? task.dueDate.substring(0, 10) : null
    };
    setCurrentTask(formattedTask);
    setIsEditing(true);
  };


  // --- GUARDAR CAMBIOS DE EDICIÓN ---
  const updateTask = async (taskToUpdate: Task) => {
    if (!taskToUpdate || !taskToUpdate.title.trim()) {
        return showNotification("El título no puede estar vacío");
    }

    try {
        await axios.put(`${API}/${taskToUpdate.id}`, {
            title: taskToUpdate.title.trim(),
            description: taskToUpdate.description || null,
            dueDate: taskToUpdate.dueDate || null,
            status: taskToUpdate.status
        });

        setIsEditing(false);
        setCurrentTask(null);
        loadTasks();
        showNotification("✅ Tarea actualizada con éxito");
    } catch (err: any) {
        console.error("Error al actualizar tarea:", err.response?.data || err);
        showNotification(`Error al actualizar: ${err.response?.data?.error || "Error desconocido"}`);
    }
  };

  // --- IMPORTAR EXCEL ---
  const importExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return showNotification("Selecciona un archivo antes de importar");

    const form = new FormData();
    form.append("file", file);
    
    try {
      const res = await axios.post(`${API}/import`, form);
      setFile(null);
      
      setCurrentPage(1); 
      loadTasks(); 
      
      showNotification(`✅ Importación exitosa: ${res.data.message}`); 
    } catch (err: any) {
      console.error("Error al importar:", err.response?.data || err);
      const errorMessage = err.response?.data?.error || "Error desconocido al importar el archivo.";
      showNotification(`Error de importación: ${errorMessage}`);
    }
  };


  // --- MODAL DE EDICIÓN ---
  const EditModal = () => {
    if (!isEditing || !currentTask) return null;

    const [editTitle, setEditTitle] = useState(currentTask.title);
    const [editDescription, setEditDescription] = useState(currentTask.description || "");
    const [editDueDate, setEditDueDate] = useState(currentTask.dueDate || "");
    
    useEffect(() => {
        setEditTitle(currentTask.title);
        setEditDescription(currentTask.description || "");
        setEditDueDate(currentTask.dueDate || "");
    }, [currentTask]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const taskToSubmit: Task = {
            ...currentTask,
            title: editTitle,
            description: editDescription,
            dueDate: editDueDate,
        };
        
        updateTask(taskToSubmit);
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
                <h3 className="text-3xl font-bold mb-6 text-indigo-800">Editar Tarea: {currentTask.title}</h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Título */}
                    <label className="block">
                        <span className="text-gray-700">Título *</span>
                        <input
                            required
                            name="title"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="mt-1 block w-full p-3 border-2 rounded-lg focus:border-indigo-600 outline-none"
                        />
                    </label>

                    {/* Descripción */}
                    <label className="block">
                        <span className="text-gray-700">Descripción</span>
                        <textarea
                            name="description"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full p-3 border-2 rounded-lg"
                        ></textarea>
                    </label>

                    {/* Fecha de Vencimiento */}
                    <label className="block">
                        <span className="text-gray-700">Fecha de Vencimiento</span>
                        <input
                            type="date"
                            name="dueDate"
                            value={editDueDate ? editDueDate.substring(0, 10) : ''}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            className="mt-1 block w-full p-3 border-2 rounded-lg"
                        />
                    </label>

                    <div className="flex justify-end space-x-4 pt-4">
                        <button
                            type="button"
                            onClick={() => { setIsEditing(false); setCurrentTask(null); }}
                            className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
  };


// --- MODAL DE CONFIRMACIÓN CUSTOM ---
const ConfirmModal = () => {
    if (!isConfirming || !taskToDelete) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 transform transition-all">
                <h3 className="text-2xl font-bold mb-4 text-black-200 flex items-center">
                  Confirmar Eliminación
                </h3>
                
                <p className="text-gray-700 mb-6">
                    ¿Deseas eliminar la tarea: 
                    <br />
                    <span className="font-semibold italic text-sm text-indigo-700">"{taskToDelete.title}"</span>?
                    <br />
                    Esta acción no es reversible.
                </p>

                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => { setIsConfirming(false); setTaskToDelete(null); }}
                        className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-100 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={confirmDeletion}
                        className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition"
                    >
                        Continuar
                    </button>
                </div>
              </div>
        </div>
    );
};


  // --- RENDERIZADO PRINCIPAL ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* ENCABEZADO PRINCIPAL */}
        <header className="text-center py-2 mb-6"> 
          <h1 className="text-5xl font-extrabold text-gray-800">
            Prueba Técnica 1
          </h1>
        </header>


        {/* NOTIFICACIÓN FLOTANTE */}
        {notification && (
          <div className="fixed top-4 right-4 bg-indigo-600 text-white px-6 py-4 rounded-lg shadow-2xl animate-pulse z-50">
            {notification}
          </div>
        )}
        
        {/* CONTENEDOR PRINCIPAL: 1/3 y 2/3 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10"> 
            
            {/* COLUMNA IZQUIERDA (1/3): CREACIÓN E IMPORTACIÓN */}
            <div className="space-y-8 lg:col-span-1">
                {/* Crear tarea */}
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                    <h2 className="text-3xl font-bold mb-6">Nueva Tarea </h2> <br /> 
                    <form onSubmit={createTask} className="grid grid-cols-1 gap-4">
                        <input required placeholder="Título *" value={title} onChange={(e) => setTitle(e.target.value)}
                            className="p-4 border-2 rounded-lg focus:border-indigo-600 outline-none" />
                        <input placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)}
                            className="p-4 border-2 rounded-lg" />
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                            className="p-4 border-2 rounded-lg" />
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-lg transition">
                            Crear Tarea
                        </button>
                        
                    </form>
                </div>

                {/* Importar Excel */}
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8"> <br /> 
                    <h2 className="text-3xl font-bold mb-6">Importar Excel</h2> <br /> 
                    <form onSubmit={importExcel} className="flex flex-col gap-4 items-stretch">
                        <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} 
                            className="flex-1 p-2 border-2 rounded-lg w-full" />
                        <button type="submit" 
                            className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-lg transition disabled:opacity-50 w-full"
                            disabled={!file}>
                            Importar
                        </button>
                    </form>
                </div>
            </div>

            {/* COLUMNA DERECHA (2/3): LISTA DE TAREAS (TABLA Y PAGINACIÓN) */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 overflow-x-auto">
                    <h2 className="text-3xl font-bold mb-6">Lista de Tareas ({tasks.length} / {totalPages > 0 && `Pág ${currentPage} de ${totalPages}`})</h2>

                    {tasks.length === 0 && (
                        <p className="text-center text-gray-500 py-10">No hay tareas para mostrar en esta página.</p>
                    )}

                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Descripción</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Vencimiento</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tasks.map((task) => (
                                <tr key={task.id}>
                                    <td className="px-3 py-4 whitespace-nowrap font-medium text-gray-900">{task.title}</td>
                                    <td className="px-3 py-4 hidden md:table-cell text-sm text-gray-500 truncate max-w-[200px]">{task.description || '-'}</td>
                                    <td className="px-3 py-4 hidden sm:table-cell text-sm text-gray-500">
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString("es-ES") : '-'}
                                    </td>
                                    <td className="px-3 py-4 whitespace-nowrap">
                                        <select
                                            value={task.status}
                                            onChange={(e) => changeStatus(task.id, e.target.value as Task["status"])}
                                            className={`w-full p-2 rounded-lg font-bold text-white transition ${
                                                task.status === "completed" ? "bg-green-600" :
                                                task.status === "in_progress" ? "bg-yellow-600" : "bg-red-600"
                                            }`}
                                        >
                                            <option value="pending">Pendiente</option>
                                            <option value="in_progress">En progreso</option>
                                            <option value="completed">Completada</option>
                                        </select>
                                    </td>
                                    <td className="px-3 py-4 text-sm font-medium flex flex-col md:flex-row gap-1">
                                        <button
                                            onClick={() => openEditModal(task)}
                                            className="text-indigo-600 hover:text-indigo-900 font-bold py-1 px-3 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition text-xs"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => deleteTask(task.id, task.title)}
                                            className="text-red-600 hover:text-red-900 font-bold py-1 px-3 border border-red-600 rounded-lg hover:bg-red-50 transition text-xs"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* CONTROLES DE PAGINACIÓN */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6 p-4 border-t border-gray-200">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ← Anterior
                            </button>
                            <span className="text-gray-700 text-sm">Página **{currentPage}** de **{totalPages}**</span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}
                </div>
            </div>

        </div> 
        
        {/* Renderiza los modales */}
        <EditModal />
        <ConfirmModal />

      </div> 
      
      {/* FOOTER */}
      <footer className="bg-gray-800 text-white mt-12 py-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-400">
          Diego David Gavilanez - Desarrollador Junior  <br/> Copyright © {currentYear}
        </div>
      </footer>
    </div> 
  );
}

export default App;