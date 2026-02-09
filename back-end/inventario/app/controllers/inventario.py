import uuid
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import (
    DescuentoCreate,
    DescuentoResponse,
    EmpaqueCreate,
    EmpaqueResponse,
    FavoritoResponse,
    GarantiaCreate,
    GarantiaResponse,
    ProductoCreate,
    ProductoResponse,
    ProductoUpdate,
    ResenaCreate,
    ResenaResponse,
    ReserveStockRequest,
    ReserveStockResponse,
    TamanoCreate,
    TamanoResponse,
    TipoProductoCreate,
    TipoProductoResponse,
    ImageUploadResponse,
)
from app.services.inventario import InventarioService
from app.services.storage import upload_image, get_public_url

router = APIRouter(prefix="/productos", tags=["productos"])
service = InventarioService()


# ══════════════════════════════════════════════════════════════════════════════
#  Tipos de producto
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/tipos", response_model=List[TipoProductoResponse])
async def list_tipos(db: AsyncSession = Depends(get_db)):
    """List all product types (admin-managed categories)."""
    return await service.list_tipos(db)


@router.post("/tipos", response_model=TipoProductoResponse, status_code=status.HTTP_201_CREATED)
async def create_tipo(data: TipoProductoCreate, db: AsyncSession = Depends(get_db)):
    """Create a new product type."""
    return await service.create_tipo(db, data)


@router.delete("/tipos/{tipo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tipo(tipo_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Delete a product type."""
    deleted = await service.delete_tipo(db, tipo_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tipo no encontrado")


# ── Garantías ─────────────────────────────────────────────────────────────────


@router.get("/garantias", response_model=List[GarantiaResponse])
async def list_garantias(db: AsyncSession = Depends(get_db)):
    return await service.list_garantias(db)


@router.post("/garantias", response_model=GarantiaResponse, status_code=status.HTTP_201_CREATED)
async def create_garantia(data: GarantiaCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_garantia(db, data)


@router.delete("/garantias/{garantia_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_garantia(garantia_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    if not await service.delete_garantia(db, garantia_id):
        raise HTTPException(status_code=404, detail="Garantia no encontrada")


# ── Empaques ──────────────────────────────────────────────────────────────────


@router.get("/empaques", response_model=List[EmpaqueResponse])
async def list_empaques(db: AsyncSession = Depends(get_db)):
    return await service.list_empaques(db)


@router.post("/empaques", response_model=EmpaqueResponse, status_code=status.HTTP_201_CREATED)
async def create_empaque(data: EmpaqueCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_empaque(db, data)


@router.delete("/empaques/{empaque_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_empaque(empaque_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    if not await service.delete_empaque(db, empaque_id):
        raise HTTPException(status_code=404, detail="Empaque no encontrado")


# ── Descuentos ────────────────────────────────────────────────────────────────


@router.get("/descuentos", response_model=List[DescuentoResponse])
async def list_descuentos(db: AsyncSession = Depends(get_db)):
    return await service.list_descuentos(db)


@router.post("/descuentos", response_model=DescuentoResponse, status_code=status.HTTP_201_CREATED)
async def create_descuento(data: DescuentoCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_descuento(db, data)


@router.delete("/descuentos/{descuento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_descuento(descuento_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    if not await service.delete_descuento(db, descuento_id):
        raise HTTPException(status_code=404, detail="Descuento no encontrado")


# ── List Products ─────────────────────────────────────────────────────────────


@router.get("/", response_model=List[ProductoResponse])
async def list_products(
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by name or SKU"),
    min_price: Optional[Decimal] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[Decimal] = Query(None, ge=0, description="Maximum price"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List products with optional filters."""
    filters = {
        "search": search,
        "min_price": min_price,
        "max_price": max_price,
        "offset": offset,
        "limit": limit,
    }
    return await service.list_products(db, filters)


# ── Upload Product Image ──────────────────────────────────────────────────────


@router.post("/upload", response_model=ImageUploadResponse)
async def upload_product_image(
    file: UploadFile = File(...),
):
    """
    Upload a product image to object storage (MinIO).
    Returns the public URL to use as ``imagen_url``.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo debe ser una imagen (JPEG, PNG, WebP, GIF).",
        )

    contents = await file.read()

    try:
        object_name = upload_image(
            file_data=contents,
            content_type=file.content_type,
            original_filename=file.filename,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    url = get_public_url(object_name)
    return ImageUploadResponse(url=url, object_name=object_name)


# ── Get Product Detail ────────────────────────────────────────────────────────


@router.get("/{product_id}", response_model=ProductoResponse)
async def get_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a single product by its ID."""
    product = await service.get_product(db, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )
    return product


# ── Create Product ────────────────────────────────────────────────────────────


@router.post("/", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductoCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new product."""
    return await service.create_product(db, data)


# ── Update Product ────────────────────────────────────────────────────────────


@router.put("/{product_id}", response_model=ProductoResponse)
async def update_product(
    product_id: uuid.UUID,
    data: ProductoUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing product."""
    product = await service.update_product(db, product_id, data)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )
    return product


# ── Delete Product ────────────────────────────────────────────────────────────


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a product by its ID."""
    deleted = await service.delete_product(db, product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )


# ── Reserve Stock ─────────────────────────────────────────────────────────────


@router.post("/{product_id}/reserve", response_model=ReserveStockResponse)
async def reserve_stock(
    product_id: uuid.UUID,
    data: ReserveStockRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reserve stock for a product (reduces available stock)."""
    return await service.reserve_stock(db, product_id, data.cantidad, data.pedido_id)


# ── Release Stock ─────────────────────────────────────────────────────────────


@router.post("/{product_id}/release", response_model=ReserveStockResponse)
async def release_stock(
    product_id: uuid.UUID,
    data: ReserveStockRequest,
    db: AsyncSession = Depends(get_db),
):
    """Release previously reserved stock (increases available stock)."""
    return await service.release_stock(db, product_id, data.cantidad, data.pedido_id)


# ══════════════════════════════════════════════════════════════════════════════
#  Tamaños (per-product size variants)
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/{product_id}/tamanos", response_model=List[TamanoResponse])
async def list_tamanos(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await service.list_tamanos(db, product_id)


@router.post(
    "/{product_id}/tamanos",
    response_model=TamanoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_tamano(
    product_id: uuid.UUID,
    data: TamanoCreate,
    db: AsyncSession = Depends(get_db),
):
    return await service.add_tamano(db, product_id, data)


@router.delete("/{product_id}/tamanos/{tamano_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tamano(
    product_id: uuid.UUID,
    tamano_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    if not await service.delete_tamano(db, tamano_id):
        raise HTTPException(status_code=404, detail="Tamano no encontrado")


# ══════════════════════════════════════════════════════════════════════════════
#  Reseñas (Reviews)
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/resenas/featured", response_model=List[ResenaResponse])
async def featured_resenas(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """Return random 5-star reviews for testimonials section."""
    return await service.list_featured_resenas(db, limit=limit)


@router.get("/{product_id}/resenas", response_model=List[ResenaResponse])
async def list_resenas(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """List all reviews for a product."""
    return await service.list_resenas(db, product_id)


@router.post(
    "/{product_id}/resenas",
    response_model=ResenaResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_resena(
    product_id: uuid.UUID,
    data: ResenaCreate,
    db: AsyncSession = Depends(get_db),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_user_name: Optional[str] = Header(None, alias="X-User-Name"),
):
    """
    Create a review for a product.
    Requires X-User-Id and X-User-Name headers (set by API gateway / frontend).
    """
    if not x_user_id or not x_user_name:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticacion para dejar una resena",
        )

    try:
        usuario_id = uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-User-Id invalido",
        )

    return await service.create_resena(
        db, product_id, usuario_id, x_user_name, data
    )


@router.delete("/{product_id}/resenas/{resena_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resena(
    product_id: uuid.UUID,
    resena_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a review (admin only)."""
    deleted = await service.delete_resena(db, resena_id, product_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resena no encontrada",
        )


# ══════════════════════════════════════════════════════════════════════════════
#  Favoritos (user bookmarks)
# ══════════════════════════════════════════════════════════════════════════════


@router.post("/favoritos/toggle")
async def toggle_favorito(
    producto_id: uuid.UUID = Query(...),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Toggle a product as favorite for the user. Returns {favorited: bool}."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Se requiere autenticacion")
    try:
        usuario_id = uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="X-User-Id invalido")
    return await service.toggle_favorito(db, usuario_id, producto_id)


@router.get("/favoritos/me", response_model=List[FavoritoResponse])
async def list_favoritos(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """List all favorites for the authenticated user."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Se requiere autenticacion")
    try:
        usuario_id = uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="X-User-Id invalido")
    return await service.list_favoritos(db, usuario_id)


@router.get("/favoritos/ids", response_model=List[uuid.UUID])
async def list_favorito_ids(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: AsyncSession = Depends(get_db),
):
    """Return list of product IDs that user has favorited."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Se requiere autenticacion")
    try:
        usuario_id = uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="X-User-Id invalido")
    return await service.list_favorito_ids(db, usuario_id)
