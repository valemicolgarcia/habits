# Pydantic: Teoría e implementación en el proyecto

Este documento explica qué es Pydantic y cómo se utiliza en el microservicio de análisis de etiquetas nutricionales.

---

## Parte 1: ¿Qué es Pydantic?

**Pydantic** es una librería de Python para **validar datos y definir esquemas** usando tipos y anotaciones. Permite describir la forma que deben tener tus datos (request, response, variables de entorno, etc.) y validar automáticamente que los valores cumplan esas reglas.

### Objetivos principales

- **Validación:** comprobar que los datos entrantes (dict, JSON, etc.) tengan los tipos correctos y cumplan restricciones (rangos, longitudes, formatos).
- **Esquemas claros:** una sola definición de clase sirve como documentación y como contrato de datos.
- **Serialización:** convertir modelos a diccionarios o JSON y al revés, de forma consistente.
- **Integración:** FastAPI usa Pydantic para los cuerpos de request/response y la documentación OpenAPI.

### Conceptos principales

#### 1. BaseModel: la base de tus esquemas

**BaseModel** es una **clase de Pydantic** de la que heredas para definir un “tipo de dato con forma fija”. No es un objeto que creas a mano; es la **plantilla** que dice: “cualquier dato que use esta clase debe tener estos campos y estos tipos”.

**En la práctica:**

1. Creas una clase que hereda de `BaseModel`.
2. Dentro pones **atributos con tipo** (por ejemplo `nombre: str`, `edad: int`). Esos atributos son los **campos** del esquema.
3. Cuando quieres validar datos (por ejemplo un diccionario que vino de JSON o de la API), **creas una instancia** pasando ese diccionario: `MiClase(**dict)`.
4. Pydantic **en el momento de crear la instancia** comprueba que cada clave exista (si es obligatoria), que el tipo sea el correcto (str, int, etc.) y que se cumplan las restricciones (ge, le, etc.). Si algo falla, lanza un error; si todo va bien, tienes un objeto con atributos ya validados.

**Ejemplo mínimo:**

```python
from pydantic import BaseModel, Field

class Persona(BaseModel):
    nombre: str
    edad: int = Field(..., ge=0, le=120)

# Datos que te llegan (ej. de un JSON o del LLM)
datos = {"nombre": "Ana", "edad": 30}

# Crear la instancia = validar
p = Persona(**datos)   # OK: nombre es str, edad está entre 0 y 120

print(p.nombre)        # "Ana"
print(p.edad)          # 30

# Si los datos son malos, Pydantic lanza al instanciar:
Persona(**{"nombre": "Ana", "edad": 150})   # Error: 150 > 120
Persona(**{"nombre": "Ana"})                 # Error: falta "edad"
Persona(**{"nombre": 123, "edad": 30})       # Error: "nombre" debe ser str
```

**Resumen:** BaseModel es la clase padre que hace que tu clase “entienda” diccionarios y los valide al instanciar. Tú defines la forma (atributos + tipos + Field); Pydantic se encarga de comprobar que los datos cumplan esa forma cuando haces `MiModelo(**dict)`.

#### 2. Field

- `Field(...)` indica que el campo es **obligatorio** (`...` = required).
- `Field(valor_default)` indica valor por defecto (p. ej. `None`, `[]`).
- Restricciones numéricas: `ge=1, le=4` (greater-or-equal, less-or-equal), `min_length`, `max_length`, etc.
- `description` sirve para documentación (p. ej. en Swagger).

#### 3. Tipos y Optional

- Tipos estándar: `str`, `int`, `bool`, `list[str]`, `dict`, etc.
- `Optional[str]` = el campo puede ser `str` o `None`; suele usarse con `Field(None)` para opcionales.

#### 4. Serialización

- **model_dump():** convierte el modelo a un diccionario Python (útil para pasar datos a otros módulos o a JSON).
- **model_dump_json():** convierte a string JSON.
- FastAPI usa automáticamente los modelos Pydantic como `response_model` para serializar la respuesta y validar la forma.

### Por qué usarlo aquí

- La respuesta del agente (`final_report`) debe tener una forma fija para el cliente; Pydantic garantiza que siempre cumpla el contrato.
- El JSON que devuelve Gemini puede venir mal formado o con tipos incorrectos; validar con un modelo justo después del analyzer evita errores más adelante en el flujo.

---

## Parte 2: Implementación en este proyecto

Los modelos Pydantic viven en `models.py`. Se usan en `main.py` (respuesta de la API) y en `nodes.py` (validación de la salida de Gemini).

### 2.1 Modelos definidos (models.py)

Ambas clases heredan de **BaseModel**. Cuando en el código haces `NutritionalResponse(**final_report)` o `AnalysisResult(**analysis_data)`, Pydantic valida el diccionario contra ese esquema; si algo falla (tipo incorrecto, campo faltante, número fuera de rango), lanza. Si todo está bien, obtienes un objeto con atributos ya validados (y puedes usar `.model_dump()` para volver a diccionario si lo necesitas).

#### NutritionalResponse

Es el **contrato de la respuesta** que devuelve `POST /analyze-label`.

```python
class NutritionalResponse(BaseModel):
    producto: str = Field(..., description="Nombre del producto identificado")
    categoria_nova: int = Field(..., ge=1, le=4, description="Categoría NOVA (1-4)")
    es_ultraprocesado: bool = Field(..., description="Si el producto es ultraprocesado (NOVA 3-4)")
    analisis_critico: str = Field(..., description="Análisis crítico del producto")
    alternativa_saludable: Optional[str] = Field(None, description="Alternativa saludable encontrada")
    link_alternativa: Optional[str] = Field(None, description="Link a la alternativa saludable")
    score_salud: int = Field(..., ge=1, le=10, description="Score de salud del producto (1-10)")
    ingredientes_principales: Optional[list[str]] = Field(None, description="Ingredientes principales identificados")
    advertencias: Optional[list[str]] = Field(None, description="Advertencias nutricionales")
```

- **Campos obligatorios** (`Field(...)`): producto, categoria_nova, es_ultraprocesado, analisis_critico, score_salud.
- **Opcionales** (`Field(None)`): alternativa_saludable, link_alternativa, ingredientes_principales, advertencias.
- **Restricciones:** `categoria_nova` entre 1 y 4, `score_salud` entre 1 y 10.

#### AnalysisResult

Es el **contrato del JSON** que debe devolver Gemini en el nodo analyzer.

```python
class AnalysisResult(BaseModel):
    producto: str
    categoria_nova: int = Field(..., ge=1, le=4)
    es_ultraprocesado: bool
    ingredientes_principales: Optional[list[str]] = None
    razonamiento: Optional[str] = None
```

- Obligatorios: producto, categoria_nova, es_ultraprocesado.
- Opcionales: ingredientes_principales, razonamiento.
- `categoria_nova` validado en rango 1–4.

### 2.2 Uso en la API (main.py)

- El endpoint declara la respuesta con el modelo:
  ```python
  @app.post("/analyze-label", response_model=NutritionalResponse)
  async def analyze_label(file: UploadFile = File(...)):
  ```
  Así FastAPI serializa la respuesta según `NutritionalResponse` y documenta el esquema en `/docs`.

- Tras ejecutar el grafo, se valida el `final_report` antes de devolverlo:
  ```python
  response = NutritionalResponse(**final_report)
  return response
  ```
  Si `final_report` tiene un tipo incorrecto o falta un campo obligatorio, Pydantic lanza y FastAPI puede devolver 500 con un mensaje claro; así no se envía al cliente un JSON inválido.

### 2.3 Uso en el grafo (nodes.py)

- En el **analyzer**, el texto que devuelve Gemini se parsea a JSON y se valida con `AnalysisResult`:
  ```python
  analysis_data = json.loads(response_text)
  analysis_result = AnalysisResult(**analysis_data)
  return { **state, "analysis": analysis_result.model_dump(), }
  ```
  Si Gemini devuelve un número fuera de 1–4 o falta un campo obligatorio, falla en este punto y no se propaga un estado incorrecto al resto del grafo.

- **model_dump()** convierte el modelo validado a diccionario para guardarlo en `state["analysis"]`, que luego leen searcher y finalizer.

### 2.4 Resumen de uso

| Modelo              | Dónde se usa        | Para qué |
|---------------------|---------------------|----------|
| **NutritionalResponse** | `main.py`           | Declarar y validar la respuesta de `POST /analyze-label`; FastAPI la serializa a JSON según este esquema. |
| **AnalysisResult**      | `nodes.py` (analyzer) | Validar el JSON devuelto por Gemini y obtener un diccionario tipado para `state["analysis"]` vía `model_dump()`. |

---

## Conclusión

- **Teoría:** Pydantic sirve para definir esquemas con tipos y restricciones, validar datos al instanciar y serializar a dict/JSON.
- **En este proyecto:** se usan dos modelos en `models.py` — **NutritionalResponse** para la respuesta de la API y **AnalysisResult** para la salida del analyzer. Así se asegura que el cliente reciba siempre un contrato conocido y que el estado del grafo no se corrompa por una respuesta mal formada de Gemini.
