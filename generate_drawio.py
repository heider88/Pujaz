import xml.etree.ElementTree as ET

mxfile = ET.Element("mxfile", host="app.diagrams.net")
diagram = ET.SubElement(mxfile, "diagram", name="Vista C&C Pujaz", id="cc")
mxGraphModel = ET.SubElement(diagram, "mxGraphModel", dx="1200", dy="900", grid="1", gridSize="10", guides="1", page="1", pageScale="1", pageWidth="1080", pageHeight="840", math="0", shadow="0", background="#FFFFFF")
root = ET.SubElement(mxGraphModel, "root")

ET.SubElement(root, "mxCell", id="0")
ET.SubElement(root, "mxCell", id="1", parent="0")

def add_box(id, value, style, x, y, w, h):
    cell = ET.SubElement(root, "mxCell", id=id, value=value, style=style, vertex="1", parent="1")
    ET.SubElement(cell, "mxGeometry", x=str(x), y=str(y), width=str(w), height=str(h), **{"as": "geometry"})

def add_edge(id, source, target, style, value=""):
    cell = ET.SubElement(root, "mxCell", id=id, value=value, style=style, edge="1", parent="1", source=source, target=target)
    ET.SubElement(cell, "mxGeometry", relative="1", **{"as": "geometry"})

# Background
add_box("bd0", "Sistema Pujaz", "rounded=1;arcSize=2;fillColor=#FBFCFE;strokeColor=#1E3A8A;strokeWidth=2;dashed=1;verticalAlign=top;align=left;spacingLeft=12;spacingTop=6;spacingBottom=6;fontStyle=1;fontSize=14;fontColor=#1E3A8A;", 20, 20, 1020, 780)

# Presentation
style_fe = "rounded=1;arcSize=8;html=1;whiteSpace=wrap;fillColor=#E8F0FE;strokeColor=#3B6FD8;strokeWidth=2;"
add_box("c_web", "<i style='font-size:10px;color:#4B5563'>«Presentación»</i><br><b style='font-size:15px;color:#1E3A8A'>Pz_web_fe</b>", style_fe, 200, 60, 200, 70)
add_box("c_movil", "<i style='font-size:10px;color:#4B5563'>«Presentación»</i><br><b style='font-size:15px;color:#1E3A8A'>Pz_movil_fe</b>", style_fe, 600, 60, 200, 70)

# Orquestador
style_ag = "rounded=1;arcSize=8;html=1;whiteSpace=wrap;fillColor=#F1ECFD;strokeColor=#7C5CD6;strokeWidth=2;"
add_box("c_api", "<i style='font-size:10px;color:#4B5563'>«Orquestador»</i><br><b style='font-size:15px;color:#4C2E9C'>Pz_api_ag</b>", style_ag, 400, 200, 200, 70)

# Logica Asincrona (arriba)
style_asinc = "rounded=1;arcSize=8;html=1;whiteSpace=wrap;fillColor=#E0F2FE;strokeColor=#0284C7;strokeWidth=2;"
add_box("c_cierre", "<i style='font-size:10px;color:#4B5563'>«Lógica»</i><br><b style='font-size:15px;color:#0284C7'>Pz_cierre_cl</b>", style_asinc, 50, 200, 160, 70)

# Logica
style_cl = "rounded=1;arcSize=8;html=1;whiteSpace=wrap;fillColor=#FFF3E2;strokeColor=#E0922F;strokeWidth=2;"
add_box("c_subastas", "<i style='font-size:10px;color:#4B5563'>«Lógica»</i><br><b style='font-size:15px;color:#8A4B0F'>Pz_subastas_cl</b>", style_cl, 50, 320, 180, 70)
add_box("c_billetera", "<i style='font-size:10px;color:#4B5563'>«Lógica»</i><br><b style='font-size:15px;color:#8A4B0F'>Pz_billetera_cl</b>", style_cl, 250, 320, 180, 70)
add_box("c_usuarios", "<i style='font-size:10px;color:#4B5563'>«Lógica»</i><br><b style='font-size:15px;color:#8A4B0F'>Pz_usuarios_cl</b>", style_cl, 450, 320, 180, 70)
add_box("c_catalogo", "<i style='font-size:10px;color:#4B5563'>«Lógica»</i><br><b style='font-size:15px;color:#8A4B0F'>Pz_catalogo_cl</b>", style_cl, 650, 320, 180, 70)
add_box("c_postpuja", "<i style='font-size:10px;color:#4B5563'>«Lógica»</i><br><b style='font-size:15px;color:#8A4B0F'>Pz_postpuja_cl</b>", style_cl, 250, 560, 180, 70)
add_box("c_notificaciones", "<i style='font-size:10px;color:#4B5563'>«Lógica»</i><br><b style='font-size:15px;color:#8A4B0F'>Pz_notif_cl</b>", style_cl, 650, 560, 180, 70)

# Broker
style_mq = "rounded=1;arcSize=8;html=1;whiteSpace=wrap;fillColor=#FEF2F2;strokeColor=#DC2626;strokeWidth=2;"
add_box("c_mq", "<i style='font-size:10px;color:#4B5563'>«Broker»</i><br><b style='font-size:15px;color:#991B1B'>Pz_eventos_mq</b>", style_mq, 200, 440, 600, 50)

# Bases de datos
style_db = "shape=cylinder3;boundedLbl=1;size=10;html=1;whiteSpace=wrap;fillColor=#E8F6EB;strokeColor=#3E9E58;strokeWidth=2;"
add_box("db_subastas", "Pz_subastas_db", style_db, 50, 680, 150, 60)
add_box("db_billetera", "Pz_billetera_db", style_db, 220, 680, 150, 60)
add_box("db_usuarios", "Pz_usuarios_db", style_db, 390, 680, 150, 60)
add_box("db_catalogo", "Pz_catalogo_db", style_db, 560, 680, 150, 60)
add_box("db_postpuja", "Pz_postpuja_db", style_db, 730, 680, 150, 60)
add_box("db_notificaciones", "Pz_notif_db", style_db, 900, 680, 120, 60)

# Edges (GraphQL)
style_gql = "endArrow=classic;html=1;strokeColor=#3B6FD8;strokeWidth=2;"
add_edge("e_web_ag", "c_web", "c_api", style_gql, "GraphQL")
add_edge("e_movil_ag", "c_movil", "c_api", style_gql, "GraphQL")

# Edges (REST)
style_rest = "endArrow=classic;html=1;strokeColor=#E0922F;strokeWidth=2;edgeStyle=orthogonalEdgeStyle;"
add_edge("e_ag_subastas", "c_api", "c_subastas", style_rest, "REST")
add_edge("e_ag_billetera", "c_api", "c_billetera", style_rest)
add_edge("e_ag_usuarios", "c_api", "c_usuarios", style_rest)
add_edge("e_ag_catalogo", "c_api", "c_catalogo", style_rest)

# Edges (AMQP)
style_amqp = "endArrow=classic;html=1;strokeColor=#DC2626;strokeWidth=2;dashed=1;"
add_edge("e_subastas_mq", "c_subastas", "c_mq", style_amqp, "AMQP")
add_edge("e_usuarios_mq", "c_usuarios", "c_mq", style_amqp)
add_edge("e_mq_billetera", "c_mq", "c_billetera", style_amqp)
add_edge("e_mq_postpuja", "c_mq", "c_postpuja", style_amqp)
add_edge("e_mq_notif", "c_mq", "c_notificaciones", style_amqp)
add_edge("e_mq_ag", "c_mq", "c_api", style_amqp)

# Edges (DB)
style_dbconn = "endArrow=classic;html=1;strokeColor=#3E9E58;strokeWidth=2;dashed=1;edgeStyle=orthogonalEdgeStyle;"
add_edge("e_db_subastas", "c_subastas", "db_subastas", style_dbconn)
add_edge("e_db_billetera", "c_billetera", "db_billetera", style_dbconn)
add_edge("e_db_usuarios", "c_usuarios", "db_usuarios", style_dbconn)
add_edge("e_db_catalogo", "c_catalogo", "db_catalogo", style_dbconn)
add_edge("e_db_postpuja", "c_postpuja", "db_postpuja", style_dbconn)
add_edge("e_db_notif", "c_notificaciones", "db_notificaciones", style_dbconn)

with open("docs/vista-cc.drawio", "wb") as f:
    f.write(ET.tostring(mxfile, encoding="utf-8"))
