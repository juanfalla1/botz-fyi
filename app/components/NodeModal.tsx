import React from "react";

const NodeModal = () => (
  <div className="node-modal" id="node-modal">
    <div className="modal-content">
      <button className="close-modal" id="close-modal">
        <i className="fas fa-times"></i>
      </button>
      <h2 className="modal-title" id="modal-title">
        Proceso de Automatización
      </h2>
      <p className="modal-description" id="modal-description">
        Detalles completos del proceso seleccionado
      </p>
      <div className="visualization-container" id="modal-visualization"></div>
      <div className="process-steps" id="modal-steps"></div>
      <p className="modal-footer" id="modal-footer">
        Cada paso del proceso está optimizado para máxima eficiencia.
      </p>
    </div>
  </div>
);

export default NodeModal;
