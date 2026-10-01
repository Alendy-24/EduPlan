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
@Table(name = "cuenta_intereses")
public class AccountInterests {
    @Id @Column(name = "id_cuenta") private Long accountId;
    @Column(name = "areas", nullable = false, columnDefinition = "text") private String areas;
    @Column(name = "motivaciones", nullable = false, columnDefinition = "text") private String motivations;
    @Column(name = "fecha_actualizacion", nullable = false) private Instant updatedAt;
}
