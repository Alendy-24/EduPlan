package com.eduplan.account;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "cuenta_guardado", uniqueConstraints = @UniqueConstraint(columnNames = {"id_cuenta", "referencia"}))
public class SavedOption {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_guardado") private Long databaseId;
    @Column(name = "id_cuenta", nullable = false) private Long accountId;
    @Column(name = "referencia", nullable = false, length = 200) private String reference;
    @Column(name = "tipo", nullable = false, length = 30) private String type;
    @Column(name = "nombre", nullable = false, length = 500) private String name;
    @Column(name = "enlace", nullable = false, length = 1000) private String href;
    @Column(name = "resumen", columnDefinition = "text") private String snapshot;
    @Column(name = "fecha_guardado", nullable = false) private Instant savedAt;
    @Column(name = "fecha_actualizacion", nullable = false) private Instant updatedAt;
}
