import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Producto, PersonalResguardo } from "../types";

export function generateMonthlyPDFReport(
  productos: Producto[],
  personal: PersonalResguardo[],
  lowStockThreshold: number
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const currentDate = new Date();
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const mesActual = meses[currentDate.getMonth()];
  const anioActual = currentDate.getFullYear();
  const fechaCompleta = `${currentDate.getDate()} de ${mesActual} de ${anioActual}`;

  // Palette colors (Slate/Deeps)
  const primaryColor: [number, number, number] = [30, 41, 59]; // slate-800
  const secondaryColor: [number, number, number] = [71, 85, 105]; // slate-600
  const accentRed: [number, number, number] = [239, 68, 68]; // red-500

  // 1. Header Decorator
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 15, "F");

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SISTEMA DE CONTROL DE INVENTARIO Y RESGUARDOS", 14, 10);

  // Report Title
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(18);
  doc.text(`REPORTE MENSUAL DE ACTIVOS - ${mesActual.toUpperCase()} ${anioActual}`, 14, 28);

  // Meta Info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha de emisión: ${fechaCompleta}`, 14, 34);
  doc.text(`Usuario realizador: Administrador`, 14, 39);

  // Calculate Stat Metrics
  const totalEquipos = productos.reduce((sum, p) => sum + p.cantidad, 0);
  const totalValor = productos.reduce((sum, p) => sum + (p.cantidad * p.precio_unitario), 0);
  const totalCustodios = personal.length;
  const equiposBajoStock = productos.filter(p => p.cantidad <= lowStockThreshold).length;

  // Draw Stat Boxes
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  
  // Box 1
  doc.rect(14, 45, 42, 20, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(totalEquipos.toString(), 20, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Unidades Totales", 20, 59);

  // Box 2
  doc.rect(62, 45, 42, 20, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`$${totalValor.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 68, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Valor de Inventario", 68, 59);

  // Box 3
  doc.rect(110, 45, 42, 20, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(totalCustodios.toString(), 116, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Personal Registrado", 116, 59);

  // Box 4 (Alerta de Stock)
  if (equiposBajoStock > 0) {
    doc.setDrawColor(254, 226, 226);
    doc.setFillColor(254, 242, 242);
    doc.rect(158, 45, 38, 20, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(accentRed[0], accentRed[1], accentRed[2]);
    doc.text(equiposBajoStock.toString(), 164, 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Alertas Stock Bajo", 164, 59);
  } else {
    doc.rect(158, 45, 38, 20, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("0", 164, 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Alertas Stock Bajo", 164, 59);
  }

  // Restore defaults
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);

  // 2. Table: Productos e Inventario
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("LISTADO GENERAL DE PRODUCTOS E INVENTARIO", 14, 73);

  const tableBody = productos.map((p) => {
    const valorTotal = p.cantidad * p.precio_unitario;
    return [
      p.codigo_local,
      p.nombre,
      p.categoria,
      `${p.edificio || "-"} (${p.ubicacion || "-"})`,
      p.cantidad,
      `$${parseFloat(p.precio_unitario.toString()).toFixed(2)}`,
      `$${valorTotal.toFixed(2)}`,
      p.resguardo_nombre || "SIN RESGUARDO"
    ];
  });

  autoTable(doc, {
    startY: 77,
    head: [["Cod. Local", "Nombre", "Categoría", "Ubicación", "Stock", "P. Unitario", "Val. Total", "Custodio / Resguardo"]],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      halign: "left"
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20 },
      3: { cellWidth: 35 },
      4: { cellWidth: 12, halign: "center" },
      5: { cellWidth: 18, halign: "right" },
      6: { cellWidth: 18, halign: "right" },
      7: { cellWidth: 32 }
    },
    didParseCell: function(data) {
      // Highlight low stock
      if (data.section === "body" && data.column.index === 4) {
        const value = parseInt(data.cell.raw as string);
        if (value <= lowStockThreshold) {
          data.cell.styles.textColor = accentRed;
          data.cell.styles.fontStyle = "bold";
        }
      }
    }
  });

  // Adding another section dynamically after table
  const nextY = (doc as any).lastAutoTable.finalY + 12;

  // 3. Table: Personal de Resguardo y Contactos
  if (nextY + 40 < 290) { // check for page break
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("DIRECTORIO Y CONTACTO DE RESGUARDOS", 14, nextY);

    const personalBody = personal.map((p) => {
      const equipCount = productos.filter((pr) => pr.resguardo_id === p.id).length;
      return [
        p.nombre_completo,
        p.correo || "No registrado",
        p.telefono || "No registrado",
        `${equipCount} activos`
      ];
    });

    autoTable(doc, {
      startY: nextY + 4,
      head: [["Nombre Completo", "Correo Electrónico", "Teléfono", "Bienes Resguardados"]],
      body: personalBody,
      theme: "grid",
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
      }
    });
  } else {
    // Add new page for personal if space is tight
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("DIRECTORIO Y CONTACTO DE RESGUARDOS", 14, 20);

    const personalBody = personal.map((p) => {
      const equipCount = productos.filter((pr) => pr.resguardo_id === p.id).length;
      return [
        p.nombre_completo,
        p.correo || "No registrado",
        p.telefono || "No registrado",
        `${equipCount} activos`
      ];
    });

    autoTable(doc, {
      startY: 24,
      head: [["Nombre Completo", "Correo Electrónico", "Teléfono", "Bienes Resguardados"]],
      body: personalBody,
      theme: "grid",
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
      }
    });
  }

  // Footer label and pagination on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "Sistema de Inventario de Activos y Resguardos - Generado de manera segura en Cloud Run",
      14,
      288
    );
    doc.text(`Página ${i} de ${pageCount}`, 180, 288);
  }

  // Save the PDF
  doc.save(`Reporte_Inventario_${mesActual}_${anioActual}.pdf`);
}
