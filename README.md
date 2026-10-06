# Full-Stack Numismatic Cataloging Platform

## Overview
A high-performance, full-stack web application engineered for the comprehensive management, cataloging, and visualization of coin and banknote collections. Designed to support official numismatic cataloging systems and manage extensive historical sets (such as 20th-century Spanish pesetas), the project prioritizes a scalable data architecture, rapid client-side rendering, and a responsive, dependency-free UI.

## Architecture & Technologies
*   **Frontend:** HTML5, CSS3 (Grid/Flexbox), Vanilla JavaScript.
*   **Backend:** Python 3, FastAPI.
*   **Database:** PostgreSQL (Serverless via Neon), SQLAlchemy (ORM).
*   **Media Storage & Processing:** Cloudinary API (on-the-fly WebP conversion & dynamic resizing).
*   **Deployment:** Render (Backend/Frontend hosting).

## Core Technical Features

*   **Heterogeneous Data Modeling (JSONB):** Implements Single-Table Inheritance using PostgreSQL `JSONB` columns. This architecture allows the system to store highly disparate entities (e.g., coins requiring diameter/weight vs. banknotes requiring serial numbers/dimensions) within the same structural table, entirely avoiding null-column bloat.
*   **Client-Side Canvas Manipulation & Cropping:** Integrates Cropper.js by intercepting upload streams via the `DataTransfer` API. Features a custom algorithmic implementation using HTML5 Canvas to dynamically punch out transparent circular PNGs for coins and free-form rectangular crops for banknotes directly in the browser before dispatching to Cloudinary.
*   **Multi-Level Sorting Algorithm:** A bespoke client-side sorting engine that resolves technical ties by sequentially evaluating multiple dimensions. The default numismatic pipeline evaluates: `Country -> Mathematical Value -> Minting Year -> Reference ID`.
*   **Numerical Value Abstraction:** Enforces strict separation between the visual representation of a currency (e.g., "50 Céntimos") and its absolute mathematical value in the database (0.5). This guarantees precise algorithmic sorting without hardcoding conversion dictionaries for historical currencies.
*   **Dynamic Pagination & Rendering:** Fully client-side pagination that dynamically recalculates elements per page based on viewport resizing. It includes an automatic injection system that renders section dividers when detecting grouping shifts (by country or year).
*   **Responsive UI & Scalability:** The interface is built entirely with pure CSS, forcing grid restructuring without relying on heavy external frameworks like Bootstrap. The database schema is designed to effortlessly expand and support Commemorative Medals and Facsimiles without backend migrations.

## Local Setup & Installation

### Prerequisites
*   Python 3.8+
*   PostgreSQL Server
*   Cloudinary API Credentials

### Installation
1. Clone the repository and install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file in the root directory:
```text
DATABASE_URL=postgresql://user:password@host/db_name
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SECRET_TOKEN=admin_access_token
```

3. Launch the development server (with hot-reload):
```bash
uvicorn main:app --reload
```
*The application will be served at `http://localhost:8000`.*

## License
Distributed under the MIT License.
