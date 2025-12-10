# Sistema de Generacion de Horarios UPV

Sistema para generar horarios universitarios automaticamente.

## Requisitos

- Python 3.10+
- Node.js 18+
- MySQL (XAMPP)
- Compilador C (MinGW o Visual Studio Build Tools)

## Configuracion inicial

### 1. Base de datos

Iniciar MySQL en XAMPP e importar la base de datos:

```bash
mysql -u root < database/horarios_universidad.sql
```

O desde phpMyAdmin: Importar el archivo `database/horarios_universidad.sql`

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

### 3. Compilar modulo Cython

Con MinGW:

```bash
cd backend/scheduler
python setup.py build_ext --inplace --compiler=mingw32
```

Con Visual Studio:

```bash
cd backend/scheduler
python setup.py build_ext --inplace
```

### 4. Frontend

```bash
cd frontend
npm install
```

## Iniciar el proyecto

### Backend (Terminal 1)

```bash
cd backend
python -m uvicorn api.main:app --reload --port 8000
```

### Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

## URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Documentacion API: http://localhost:8000/docs
